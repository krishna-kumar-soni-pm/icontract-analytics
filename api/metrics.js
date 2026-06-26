// Vercel serverless function: live iContract backend (APM) metrics from the Datadog REST API.
// Keys come from env vars (DD_API_KEY, DD_APP_KEY, DD_SITE) and never reach the browser.
// The React app fetches /api/metrics on load; the heavy RUM cohort stays a snapshot.

const SITE = process.env.DD_SITE || 'datadoghq.com'
const PROD = { prus:'Prod US', euprdc:'Prod EU', sgprdc:'Prod SG', auprdc:'Prod AU·1', aust1:'Prod AU·2', nvprdc:'Prod NV' }
const PROD_KEYS = Object.keys(PROD)
const SVC = 'service:icontract-backend-api'

async function ddQuery(query, from, to) {
  const u = new URL(`https://api.${SITE}/api/v1/query`)
  u.searchParams.set('from', String(from))
  u.searchParams.set('to', String(to))
  u.searchParams.set('query', query)
  const r = await fetch(u, { headers: { 'DD-API-KEY': process.env.DD_API_KEY, 'DD-APPLICATION-KEY': process.env.DD_APP_KEY } })
  if (!r.ok) throw new Error(`Datadog ${r.status}`)
  return r.json()
}
const envOf = scope => { const m = /env:([^,}]+)/.exec(scope || ''); return m ? m[1] : null }
const byEnvMap = series => { const o = {}; (series || []).forEach(s => { o[envOf(s.scope)] = s.pointlist || [] }); return o }
const sum = a => (a || []).reduce((s, p) => s + (p[1] || 0), 0)
const fmtM = n => n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M' : String(Math.round(n))
const WD = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

export default async function handler(req, res) {
  try {
    if (!process.env.DD_API_KEY || !process.env.DD_APP_KEY) throw new Error('Datadog keys not configured')
    const now = Math.floor(Date.now() / 1000), d90 = now - 90 * 86400, d7 = now - 7 * 86400
    const S = 'trace.servlet.request'
    const [hitsD, errD, latD, hitsH] = await Promise.all([
      ddQuery(`sum:${S}.hits{${SVC}}by{env}.as_count().rollup(sum,86400)`, d90, now),
      ddQuery(`sum:${S}.errors{${SVC}}by{env}.as_count().rollup(sum,86400)`, d90, now),
      ddQuery(`avg:${S}.duration{${SVC}}by{env}.rollup(avg,86400)`, d90, now),
      ddQuery(`sum:${S}.hits{${SVC}}by{env}.as_count().rollup(sum,3600)`, d7, now),
    ])
    const H = byEnvMap(hitsD.series), E = byEnvMap(errD.series), L = byEnvMap(latD.series), HH = byEnvMap(hitsH.series)

    const byEnv = PROD_KEYS.map(k => {
      const hits = sum(H[k]), errs = sum(E[k])
      const lmap = {}; (L[k] || []).forEach(p => { lmap[p[0]] = p[1] })
      let wn = 0, wd = 0; (H[k] || []).forEach(p => { const l = lmap[p[0]]; if (l != null) { wn += p[1] * l; wd += p[1] } })
      const avgMs = wd ? Math.round(wn / wd * 1000) : null
      return { k, label: PROD[k], hits, errs, errRate: hits ? errs / hits * 100 : 0, avgMs }
    }).filter(e => e.hits > 0)

    const totalReq = byEnv.reduce((s, e) => s + e.hits, 0)
    const totalErr = byEnv.reduce((s, e) => s + e.errs, 0)

    // daily prod trend
    const dayMap = {}; PROD_KEYS.forEach(k => (H[k] || []).forEach(p => { dayMap[p[0]] = (dayMap[p[0]] || 0) + (p[1] || 0) }))
    const days = Object.keys(dayMap).map(Number).sort((a, b) => a - b)
    const dailyTrend = days.map(ts => Math.round(dayMap[ts]))

    // weekday fold (UTC, Mon-first)
    const wd7 = [0,0,0,0,0,0,0]
    days.forEach(ts => { wd7[(new Date(ts).getUTCDay() + 6) % 7] += dayMap[ts] })
    const weekday = WD.map((n, i) => [n, Math.round(wd7[i])])

    // hour-of-day fold (prod, 7d hourly)
    const hrs = new Array(24).fill(0)
    PROD_KEYS.forEach(k => (HH[k] || []).forEach(p => { hrs[Math.floor(p[0] / 3600000) % 24] += (p[1] || 0) }))
    const hours = hrs.map(v => Math.round(v))

    // MoM from the daily series
    const last30 = dailyTrend.slice(-30).reduce((s, v) => s + v, 0)
    const prev30 = dailyTrend.slice(-60, -30).reduce((s, v) => s + v, 0)
    const momPct = prev30 ? (last30 - prev30) / prev30 * 100 : 0

    const sorted = [...byEnv].sort((a, b) => b.hits - a.hits)
    const regionVol = sorted.map(e => [`${e.label} (${e.k})`, e.hits, Math.round(e.hits / totalReq * 100) + '%'])
    const regionTbl = sorted.map(e => [e.label, fmtM(e.hits), e.errRate.toFixed(3) + '%', e.avgMs ?? '–', e.errRate < 0.025 ? 'ok' : 'warn'])

    const peakH = hours.indexOf(Math.max(...hours))
    const peakDayIdx = wd7.reduce((mi, v, i) => v > wd7[mi] ? i : mi, 0)
    const wdAvg = (wd7[0] + wd7[1] + wd7[2] + wd7[3] + wd7[4]) / 5
    const weAvg = (wd7[5] + wd7[6]) / 2 || 1
    const overallErr = totalReq ? totalErr / totalReq * 100 : 0
    const avgMsAll = Math.round(byEnv.reduce((s, e) => s + (e.avgMs || 0) * e.hits, 0) / (totalReq || 1))

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600')
    res.status(200).json({
      updatedAt: new Date().toISOString(),
      windowDays: 90,
      kpi: {
        requests: fmtM(totalReq), requestsSub: `${byEnv.length} prod regions`,
        errorRate: overallErr.toFixed(3) + '%', errorsSub: `${totalErr.toLocaleString()} errors`,
        latency: `~${avgMsAll} ms`, latencySub: 'hits-weighted',
        mom: (momPct >= 0 ? '+' : '') + momPct.toFixed(0) + '%', momSub: 'last 30d vs prior 30d',
        peak: `${WD[peakDayIdx]} · ${peakH}:00 UTC`, peakSub: `weekdays ${(wdAvg / weAvg).toFixed(1)}× weekend`,
      },
      dailyTrend, hours, weekday, regionVol, regionTbl,
    })
  } catch (e) {
    res.status(500).json({ error: String(e && e.message || e) })
  }
}
