import { useState } from 'react'
import * as D from './data.js'
import { KpiGrid, BarList, AreaTrend, HourBars, Sankey, Funnel, UserExplorer, Section, Insight, fmt } from './components.jsx'
import { useMetrics } from './useMetrics.js'
import { useRum } from './useRum.js'

const TABS = [
  { id:'overview', label:'Overview', win:'90d' },
  { id:'flow', label:'Funnel & Flows', win:'30d' },
  { id:'users', label:'Users', win:'30d' },
  { id:'exp', label:'Experience', win:'30d' },
  { id:'more', label:'Quality & Adoption', win:'30d' },
]
const F90 = { cls:'b90', label:'L90D · APM' }
const F30 = { cls:'r30', label:'L30D · RUM' }

function Card({ title, hint, children, style }) {
  return (
    <div className="card" style={style}>
      {title && <h3>{title}</h3>}
      {hint && <p className="hint">{hint}</p>}
      {children}
    </div>
  )
}

function Tag({ k, children }) { return <span className={'tag ' + k}>{children}</span> }

export default function App() {
  const [tab, setTab] = useState('overview')
  const [filter, setFilter] = useState(null)
  const [q, setQ] = useState('')
  const go = id => { setTab(id); window.scrollTo({ top: 0 }) }
  // drill from any funnel step or flow into the matching, filtered Users view
  const drill = f => { setFilter(f); setQ(''); go('users') }

  // Live backend (APM) metrics fetched from /api/metrics on load; falls back to the snapshot.
  const { m, status } = useMetrics()
  // Live RUM cohort + funnel + breakdowns from /api/rum (customer data, never bundled).
  const { r } = useRum()
  const rumKpi = r
    ? { v:String(r.kpi.tenants), l:'Active tenants (30d RUM)', t:`${r.kpi.users} users sampled`, c:'neutral' }
    : D.kpis[5]
  const ov = {
    kpis: m ? [
      { v:m.kpi.requests,  l:'Backend requests (L90D, prod)', t:m.kpi.requestsSub, c:'neutral' },
      { v:m.kpi.errorRate, l:'Server error rate',             t:m.kpi.errorsSub,   c:'up' },
      { v:m.kpi.latency,   l:'Avg API latency (90d)',         t:m.kpi.latencySub,  c:'up' },
      { v:m.kpi.mom,       l:'MoM growth',                    t:m.kpi.momSub,      c:'up' },
      { v:m.kpi.peak,      l:'Peak day & hour (UTC)',         t:m.kpi.peakSub,     c:'neutral' },
      rumKpi,
    ] : [...D.kpis.slice(0, 5), rumKpi],
    dailyTrend: m?.dailyTrend || D.dailyTrend,
    hours:      m?.hours || D.hours,
    weekday:    m?.weekday || D.weekday,
    regionVol:  m?.regionVol || D.regionVol,
    regionTbl:  m?.regionTbl || D.regionTbl,
  }
  const rum = {
    users:      r?.users || D.users,
    stageReach: r?.stageReach || D.stageReach,
    tenants:    r?.tenants || D.tenants,
    geo:        r?.geo || D.geo,
    browsers:   r?.browsers || D.browsers,
  }

  // ---- automated insights computed from the live data ----
  const peakHour = ov.hours.indexOf(Math.max(...ov.hours))
  const wdAvg = ov.weekday.filter(d => !['Sat','Sun'].includes(d[0])).reduce((s,d)=>s+d[1],0) / 5
  const weAvg = (ov.weekday.filter(d => ['Sat','Sun'].includes(d[0])).reduce((s,d)=>s+d[1],0) / 2) || 1
  const wdRatio = (wdAvg / weAvg).toFixed(1)
  const topRegion = ov.regionVol[0]
  const hottest = [...ov.regionTbl].sort((a,b)=>parseFloat(b[2])-parseFloat(a[2]))[0]
  const reachOpen = rum.stageReach.find(s => s.k === 'open')
  const reachSign = rum.stageReach.find(s => s.k === 'signoff')
  const up = D.userpilot

  return (
    <>
      <div className="wrap">
        <header className="hero">
          <div className="eyebrow">Zycus Source-to-Pay · Contract Lifecycle Management · Datadog</div>
          <h1>iContract product analytics</h1>
          <p className="sub">Request volume and reliability, time-of-day rhythm, the authoring to sign-off funnel, page-to-page flows, and named user journeys down to the session. Backend spans 90 days; user-level data spans the ~30 days Datadog RUM retains.</p>
          <div className="meta-row">
            <span className="chip w90">Backend (APM): <b>L90D</b></span>
            <span className="chip w30">User-level (RUM): <b>L30D</b></span>
            <span className="chip" style={status==='live'?{borderColor:'#bcd7c4',background:'var(--green-tint)',color:'var(--green)'}:undefined}>
              {status==='live' ? `● Live · ${new Date(m.updatedAt).toLocaleDateString(undefined,{day:'numeric',month:'short'})} ${new Date(m.updatedAt).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'})}` : status==='loading' ? '◌ Loading live…' : '● Snapshot'}
            </span>
            <span className="chip">6 prod regions</span>
            <span className="chip">86 tenants · 812 users</span>
          </div>
        </header>
      </div>

      <div className="tabs"><div className="inner">
        {TABS.map(t => (
          <button key={t.id} className={'tab' + (tab === t.id ? ' active' : '')} onClick={() => go(t.id)}>
            {t.label} <span className="c">{t.win}</span>
          </button>
        ))}
      </div></div>

      <div className="wrap">
        {/* ===== OVERVIEW ===== */}
        {tab === 'overview' && (
          <div className="panel active">
            <KpiGrid items={ov.kpis} />
            <Section kicker="Usage over time" title="Request volume" flag={F90}
              lead="Daily production traffic across all six regions over the last 90 days. Weekday peaks, weekend troughs.">
              {m && <Insight>Backend demand is <b>{m.kpi.mom}</b> month-over-month and peaks on <b>{m.kpi.peak.split(' · ')[0]}</b>. The dominant rhythm is the working week — {m.kpi.peakSub}. Hover the line for any day's volume.</Insight>}
              <Card hint="Daily totals · prod regions summed · hover for daily values"><AreaTrend data={ov.dailyTrend} /></Card>
            </Section>
            <Section kicker="When people work" title="Time-of-day & weekday rhythm" flag={F90}
              lead="A follow-the-sun workload: EU leads the mornings, the US carries the afternoons, and weekdays far outweigh weekends.">
              <Insight>The busiest UTC hour is <b>{peakHour}:00</b> and weekdays run <b>{wdRatio}×</b> heavier than weekends — a business-hours load. Schedule deploys and maintenance for the ~05:00 UTC global trough.</Insight>
              <div className="grid g23">
                <Card title="Requests by hour of day (UTC)" hint="Prod regions · last 7 days folded to hour-of-day"><HourBars data={ov.hours} /></Card>
                <Card title="By weekday" hint="Busiest day highlighted">
                  <BarList size="sm" rows={ov.weekday.map(d => ({ name:d[0], v:d[1], color:(d[0]==='Sat'||d[0]==='Sun')?D.C.slate:(d[1]===Math.max(...ov.weekday.map(x=>x[1]))?D.C.blue:'#5e94d0'), label:fmt(d[1]) }))} />
                </Card>
              </div>
            </Section>
            <Section kicker="Where the load lives" title="Traffic & reliability by region" flag={F90}
              lead="US and EU carry most backend traffic; server-side error rates stay well under a tenth of a percent.">
              <Insight><b>{topRegion[0].replace(/\s*\(.*\)/,'')}</b> carries <b>{topRegion[2]}</b> of backend load. Reliability is healthy everywhere; <b>{hottest[0]}</b> runs the hottest error rate at {hottest[2]} — still a small fraction of a percent.</Insight>
              <div className="grid g2">
                <Card title="90-day request volume" hint="Total requests · share of prod">
                  <BarList rows={ov.regionVol.map(r => ({ name:r[0], v:r[1], color:D.C.blue, label:fmt(r[1]), sub:r[2] }))} />
                </Card>
                <Card title="Reliability & latency" hint="Server-side error rate & average response time (90d)">
                  <table><thead><tr><th>Region</th><th style={{textAlign:'right'}}>Requests</th><th style={{textAlign:'right'}}>Err</th><th style={{textAlign:'right'}}>Avg ms</th><th>Health</th></tr></thead>
                    <tbody>{ov.regionTbl.map((x,i) => <tr key={i}><td>{x[0]}</td><td className="num">{x[1]}</td><td className="num">{x[2]}</td><td className="num">{x[3]}</td><td><Tag k={x[4]}>{x[4]==='ok'?'Healthy':'Watch'}</Tag></td></tr>)}</tbody></table>
                </Card>
              </div>
            </Section>
          </div>
        )}

        {/* ===== FUNNEL & FLOWS ===== */}
        {tab === 'flow' && (
          <div className="panel active">
            <div className="drill-note">Hover any step or flow for the insight behind it. Click to open the exact users in the Users tab.</div>
            <Section kicker="Conversion" title="The authoring to execution funnel" flag={F30}
              lead="Stage reach counts every user who touched an area; the strict funnel counts only same-session author → workflow → sign-off order.">
              {reachOpen && reachSign && <Insight><b>{reachOpen.main}</b> of users open a contract, but only <b>{reachSign.main}</b> reach sign-off — the lifecycle plays out across many sessions, so multi-session continuity (notifications, "resume where you left off") is the highest-leverage fix. Hover or click any step to open those users.</Insight>}
              <div className="grid g2">
                <Card title="Stage reach · users touching each area" hint="Share of 812 sampled users · click a step to open them">
                  <Funnel rows={rum.stageReach} max={100} colors={[D.C.blue,D.C.merlin,D.C.blue,D.C.amber,D.C.green,D.C.slate]} onDrill={drill} />
                </Card>
                <Card title="Strict in-session funnel" hint="Same session, in temporal order">
                  <Funnel rows={D.seqFunnel} max={100} colors={[D.C.blue,D.C.amber,D.C.green]} onDrill={drill} />
                </Card>
              </div>
            </Section>
            <Section kicker="Navigation" title="Page-to-page flow" flag={F30}
              lead="Dominant path: a <b>list</b> → a <b>contract detail</b> → <b>Signing</b> or <b>Workflow</b>. Authoring and Repository are parallel spines.">
              <div className="grid g2">
                <Card title="Core navigation flow" hint="Top transitions · link width ∝ session count"><Sankey links={D.sankeyLinks} onDrill={drill} /></Card>
                <Card title="Top transitions" hint="Source → destination · click to open these users">
                  <BarList rows={D.transitions.map(t => ({ name:t.label, v:t.v, color:D.C.blue, label:t.v, drill:{ label:t.label, stages:t.stages } }))} onRowClick={drill} />
                </Card>
              </div>
            </Section>
            <Section kicker="Session shape" title="How a typical session looks" flag={F30}>
              <KpiGrid items={D.sessionKpis} />
              <div className="grid g2" style={{marginTop:'16px'}}>
                <Card title="Where journeys start" hint="First page in session"><BarList rows={D.entryPages.map(p => ({ name:p[0], v:p[1], color:D.C.blue, label:p[1] }))} /></Card>
                <Card title="Where journeys end" hint="Last page in session"><BarList rows={D.exitPages.map(p => ({ name:p[0], v:p[1], color:D.C.merlin, label:p[1] }))} /></Card>
              </div>
            </Section>
          </div>
        )}

        {/* ===== USERS ===== */}
        {tab === 'users' && (
          <div className="panel active">
            <Section kicker="Exactly who" title="User explorer" flag={F30}
              lead="Search by name, tenant or role, or arrive here filtered from a funnel step or flow. Click any user to open their session detail.">
              {r && <Insight>This table is a <b>live RUM sample</b> ({r.kpi.users} users from recent sessions) — not the full population. The true 30-day active-user count for iContract is <b>{up.iContract.activeUsers.toLocaleString()}</b> across <b>{up.iContract.companies} companies</b> (Userpilot). Use this view for session-level "who/how", not for sizing the user base.</Insight>}
              <UserExplorer users={rum.users} journeys={D.journeys} filter={filter} q={q} setQ={setQ} onClear={() => setFilter(null)} />
              <Card title="Role distribution" hint="iContract roles across sampled users" style={{marginTop:'16px'}}>
                <BarList rows={D.roles.map(r => ({ name:r[0], v:r[1], color:D.C.merlin, label:r[1] }))} />
              </Card>
            </Section>
          </div>
        )}

        {/* ===== EXPERIENCE ===== */}
        {tab === 'exp' && (
          <div className="panel active">
            <Section kicker="Product engagement" title="CLM lifecycle engagement" flag={F30}
              lead="Mapped onto iContract's 8-stage spine. <b>Pre-signature work dominates</b>; post-signature AI modules (Obligations, Risk Monitor) show near-zero engagement.">
              <div className="spine">{D.spine.map((s,i) => (
                <div className="stage" key={i}><span className="heat" style={{height:s[3]+'%',background:s[4]}} /><div className="n mono">{s[0]}</div><h4>{s[1]}</h4><div className="u mono" style={{color:s[4]}}>{s[2]}</div></div>
              ))}</div>
              <Card title="Area engagement · relative index" hint="Indexed RUM views · highest area = 100" style={{marginTop:'16px'}}>
                <BarList rows={D.areaEngagement.map(s => ({ name:s[0], v:s[1], color:s[2], label:Math.round(s[1]/1888*100) }))} />
              </Card>
            </Section>
            <Section kicker="Experience quality" title="Front-end performance" flag={F30}
              lead="Page experience is solid (avg FCP 0.56s, LCP 1.80s, both ‘good’). <b>Negotiate</b> is the heaviest screen; contract-detail pages have slow tails past 25s.">
              <div className="grid g2">
                <Card title="Largest Contentful Paint by area" hint="Average LCP (ms) · lower is better">
                  <BarList rows={D.perfLcp.map(p => ({ name:p[0], v:p[1], color:p[2], label:p[1].toLocaleString()+' ms' }))} />
                </Card>
                <Card title="Core web vitals · overall" hint="iContract production">
                  <table><tbody>{D.vitals.map((r,i) => <tr key={i}><td>{r[0]}</td><td className="num">{r[1]}</td><td><Tag k={r[2]}>{r[3]}</Tag></td></tr>)}</tbody></table>
                </Card>
              </div>
            </Section>
          </div>
        )}

        {/* ===== QUALITY & ADOPTION ===== */}
        {tab === 'more' && (
          <div className="panel active">
            <Section kicker="Stability" title="Front-end errors" flag={F30}
              lead="Browser errors are mostly <b>framework noise</b> on contract-detail pages. A few outlier sessions stand out with 1,000+ errors in one sitting.">
              <div className="grid g2">
                <Card title="Most frequent error signatures" hint="Sampled · share of error events">
                  <table><thead><tr><th>Signature</th><th style={{textAlign:'right'}}>Share</th><th>Type</th></tr></thead>
                    <tbody>{D.errSignatures.map((e,i) => <tr key={i}><td>{e[0]}</td><td className="num">{e[1]}%</td><td><Tag k={e[2]}>{e[3]}</Tag></td></tr>)}</tbody></table>
                </Card>
                <Card title="Where errors land" hint="Top pages in the error sample">
                  <BarList rows={D.errPages.map(p => ({ name:p[0], v:p[1], color:D.C.red, label:p[1] }))} />
                  <div className="callout red" style={{marginTop:'16px'}}><b>Flagged:</b> a few users hit <b>1,000+</b> client-side errors in single sessions, far above the ~10 to 25 typical. Likely tenant-specific config. Open the Users tab, sort by errors, and pull session replay for the worst offenders.</div>
                </Card>
              </div>
            </Section>
            <Section kicker="The differentiator" title="Merlin GenAI instrumentation gap" flag={F30}>
              <Insight><b>Independently confirmed by Userpilot:</b> {up.aiZero.join(', ')} each logged <b>0</b> events in iContract. Two separate analytics tools agree the AI layer has no measurable usage — a real adoption gap, not just a tracking blind spot.</Insight>
              <div className="grid g2">
                <Card title="Detectable AI-feature signal" hint="Whether each Merlin feature produced a clean RUM signal">
                  <table><thead><tr><th>Feature</th><th>Signal</th><th>Read</th></tr></thead>
                    <tbody>{D.aiFeatures.map((a,i) => <tr key={i}><td>{a[0]}</td><td><Tag k={a[1]}>{a[2]}</Tag></td><td style={{fontSize:'12px'}}>{a[3]}</td></tr>)}</tbody></table>
                </Card>
                <Card style={{display:'flex',alignItems:'center'}}>
                  <div className="callout amber"><b>The flagship AI layer is effectively unmeasured.</b><br/><br/>Merlin features (Nego Genie, Obligation Extract, Risk Monitor, Comparator, Ask AI, Contract Discovery) live inside tabs and modals without dedicated URLs or tagged actions, so RUM can't see them. Absence of signal is not absence of use, but today the business <b>cannot prove AI ROI</b>. Recommendation: emit explicit custom actions (e.g. <span className="mono">merlin.nego_genie.recommendation_accepted</span>).</div>
                </Card>
              </div>
            </Section>
            <Section kicker="Footprint" title="Customer adoption" flag={F30}>
              <Insight>Per Userpilot, <b>{up.searchSharePct}%</b> of all iContract events are list <b>search</b> — the product is used mostly to <b>find</b> contracts, not author them (Create Contract: 230 events; Approvals: 8). Tenant universe cross-checks cleanly: Datadog sees {r ? r.kpi.tenants : '~47'} tenants vs Userpilot's <b>{up.iContract.companies} companies</b>.</Insight>
              <div className="grid g3">
                <Card title="Top tenants" hint="Users per tenant (live sample)"><BarList rows={rum.tenants.map(t => ({ name:t[0], v:t[1], color:D.C.merlin, label:String(t[1]) }))} /></Card>
                <Card title="Geography" hint="Users per country (Zycus QA excluded)"><BarList rows={rum.geo.map(g => ({ name:g[0], v:g[1], color:D.C.blue, label:String(g[1]) }))} /></Card>
                <Card title="Environment" hint="Browser & device">
                  <BarList rows={rum.browsers.map(b => ({ name:b[0], v:b[1], color:b[2] || D.C.merlin, label:String(b[1]) }))} />
                  <p className="hint" style={{margin:'14px 0 4px'}}>Device</p>
                  <BarList rows={[{ name:'Desktop', v:100, color:D.C.green, label:'100%' }]} />
                </Card>
              </div>
            </Section>
          </div>
        )}

        <footer>
          <div className="src">Source · Datadog (US1) · org Zycus · APM <b>icontract-backend-api</b> (L90D) + RUM <b>Zycus / DewDrops-iContract</b> (L30D) · generated 25 Jun 2026.</div>
          <details>
            <summary>Methodology & data quality</summary>
            <ul className="note-list">
              <li><b>Two windows by necessity.</b> APM retains 90+ days (volume, reliability, latency, temporal). RUM retains only ~30 days, so funnel, flows, users and experience are L30D. Platform limit, not a choice.</li>
              <li><b>Backend is exact</b> (<span className="mono">trace.servlet.request.*</span>; p95 unavailable, so averages are request-weighted). <b>RUM is merged real-session snapshots</b> (3,000 view events, 640 sessions); engagement is a relative index, not absolute counts.</li>
              <li><b>Privacy.</b> Emails masked; Zycus QA, bot and HeadlessChrome excluded; customer employees in India kept.</li>
              <li><b>AI features</b> are largely un-instrumented in RUM, an instrumentation gap rather than an adoption verdict.</li>
            </ul>
          </details>
        </footer>
      </div>
    </>
  )
}
