// Vercel serverless function: live iContract RUM cohort + funnel + breakdowns from the
// Datadog RUM REST API. The customer data is fetched at request time (cached), never stored
// in the repo or shipped in the client bundle. Keys come from server-side env vars.

const SITE = process.env.DD_SITE || 'datadoghq.com'
const APP_ID = '406767d2-f10a-4c1c-ae45-052c458e8502'
const QUERY = `@type:view @application.id:${APP_ID} service:DewDrops-iContract env:*pr*`

// Sample windows spread across the retained ~30 days for breadth of users.
const ANCHORS = [0, 6, 12, 18, 24] // days back from now

async function fetchSlice(fromMs, toMs) {
  const u = new URL(`https://api.${SITE}/api/v2/rum/events`)
  u.searchParams.set('filter[query]', QUERY)
  u.searchParams.set('filter[from]', String(fromMs))
  u.searchParams.set('filter[to]', String(toMs))
  u.searchParams.set('page[limit]', '1000')
  u.searchParams.set('sort', '-timestamp')
  const r = await fetch(u, { headers: { 'DD-API-KEY': process.env.DD_API_KEY, 'DD-APPLICATION-KEY': process.env.DD_APP_KEY } })
  if (!r.ok) throw new Error(`Datadog RUM ${r.status}`)
  const j = await r.json()
  return j.data || []
}

const ROLE_SHORT = { 'Contract Author':'Author', 'Contract Reviewer':'Reviewer', 'Contract Manager':'Manager', 'Purchase Manager':'Purchase Manager', 'Legal':'Legal', 'Contract Administrator':'Admin', 'Customer Admin':'Admin' }
const ROLE_RANK = ['Author','Reviewer','Manager','Purchase Manager','Legal','Admin']

function stagesFor(path) {
  const p = (path || '').toLowerCase(), out = new Set()
  if (p.includes('/contract/')) out.add('open')         // opened a contract detail (either side)
  if (p.includes('authoring')) out.add('authoring')
  if (p.includes('repository')) out.add('repository')
  if (p.includes('workflow') || p.includes('authoringapprovals') || p.includes('approvals-and-reviews')) out.add('workflow')
  if (p.includes('signoff') || p.includes('signing')) out.add('signoff')
  if (/\/icontract\/(icontract\/)?home$/.test(p)) out.add('home')
  return out
}
const maskEmail = e => { if (!e || !e.includes('@')) return ''; const [l, d] = e.split('@'); return (l[0] || '') + '•••@' + d }
const isBot = (email, name, browser) => /@zycus\.com$/i.test(email || '') || /^auto-user|test/i.test(name || '') || browser === 'HeadlessChrome'

export default async function handler(req, res) {
  try {
    // password gate — protects the data even on a public domain (fail-closed)
    if (!process.env.ACCESS_PASSWORD || (req.headers['x-access-key'] || '') !== process.env.ACCESS_PASSWORD) {
      res.status(401).json({ error: 'unauthorized' }); return
    }
    if (!process.env.DD_API_KEY || !process.env.DD_APP_KEY) throw new Error('Datadog keys not configured')
    const now = Date.now()
    const slices = await Promise.all(ANCHORS.map(d => {
      const to = now - d * 86400_000
      return fetchSlice(to - 1800_000, to).catch(() => [])
    }))
    const events = slices.flat()

    const U = new Map()
    for (const ev of events) {
      const a = ev.attributes && ev.attributes.attributes; if (!a) continue
      const usr = a.usr || {}, view = a.view || {}
      if (!usr.id) continue
      const browser = (a.browser || {}).name
      if (isBot(usr.email, usr.name, browser)) continue
      let u = U.get(usr.id)
      if (!u) { u = { id:usr.id, n:usr.name || '(unknown)', email:usr.email || '', t:usr.tenantName || '(unknown)', country:(a.geo || {}).country, browser, device:(a.device || {}).type, sessions:new Set(), v:0, mins:0, err:0, stages:new Set(), roles:new Set() }; U.set(usr.id, u) }
      u.v += 1
      if (a.session && a.session.id) u.sessions.add(a.session.id)
      u.mins += (view.time_spent || 0) / 1e9 / 60
      u.err += (view.error && view.error.count) || 0
      stagesFor(view.url_path_group).forEach(s => u.stages.add(s))
      const roles = (a.context && a.context.roles) || []
      roles.forEach(o => { const r = o && o.iContract; if (Array.isArray(r)) r.forEach(x => { if (ROLE_SHORT[x]) u.roles.add(ROLE_SHORT[x]) }) })
    }

    const users = [...U.values()].map(u => ({
      n:u.n, e:maskEmail(u.email), t:u.t, country:u.country, device:u.device,
      r:[...u.roles].sort((a,b)=>ROLE_RANK.indexOf(a)-ROLE_RANK.indexOf(b)).slice(0,3).join(' · '),
      sessions:u.sessions.size, v:u.v, a:Math.round(u.mins) + 'm', err:u.err, stages:[...u.stages],
    })).sort((a,b) => b.v - a.v)

    // funnel stage reach (users touching each stage)
    const total = users.length
    const stageCount = k => users.filter(u => u.stages.includes(k)).length
    const order = ['open','authoring','repository','workflow','home','signoff']
    const labels = { open:'Open contract', authoring:'Browse authoring', repository:'Repository', workflow:'Workflow / Review', home:'Landing / Home', signoff:'Sign-off' }
    const stageReach = order.map(k => { const c = stageCount(k), pct = total ? Math.round(c / total * 100) : 0; return { k, label:labels[k], pct, main:pct + '%', sub:`${c} users` } }).sort((a,b)=>b.pct-a.pct)

    // breakdowns
    const tally = (arr, key) => { const m = {}; arr.forEach(u => { const v = key(u); if (v) m[v] = (m[v]||0)+1 }); return Object.entries(m).sort((a,b)=>b[1]-a[1]) }
    const tenants = tally(users, u=>u.t).slice(0, 8)
    const geo = tally(users.filter(u=>u.country!=='India'), u=>u.country).slice(0, 7)
    const browsers = tally(users, u=>u.browser).slice(0, 4)

    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=86400')
    res.status(200).json({
      updatedAt: new Date().toISOString(),
      sampledEvents: events.length,
      kpi: { users: total, sessions: users.reduce((s,u)=>s+u.sessions,0), tenants: new Set(users.map(u=>u.t)).size },
      users, stageReach, tenants, geo, browsers,
    })
  } catch (e) {
    res.status(500).json({ error: String(e && e.message || e) })
  }
}
