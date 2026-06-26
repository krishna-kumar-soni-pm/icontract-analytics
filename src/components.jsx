import { useState, Fragment } from 'react'
import { C, STAGE, NODE_STAGE } from './data.js'

export const fmt = n => n >= 1e6 ? (n/1e6).toFixed(n>=1e7?0:1)+'M' : n >= 1e3 ? (n/1e3).toFixed(0)+'k' : (''+Math.round(n))

export function Kpi({ v, l, t, c }) {
  return (
    <div className="kpi">
      <div className="v" dangerouslySetInnerHTML={{ __html: v.replace(/(\s?(ms|s)\b)/, '<small style="font-size:13px">$1</small>') }} />
      <div className="l">{l}</div>
      {t && <div className={'t ' + (c || 'neutral')}>{t}</div>}
    </div>
  )
}

export function KpiGrid({ items }) {
  return <div className="kpis">{items.map((k, i) => <Kpi key={i} {...k} />)}</div>
}

// hover insight + click-to-drill strip shown under an interactive chart
function InsightStrip({ insight, prompt }) {
  return (
    <div className={'insight' + (insight ? ' on' : '')}>
      {insight
        ? <span><b>{insight.title}</b> {insight.body}</span>
        : <span className="prompt">{prompt}</span>}
    </div>
  )
}

// horizontal bar list; rows may carry a `drill` payload to make them clickable
export function BarList({ rows, size, onRowClick }) {
  const max = Math.max(...rows.map(r => r.v))
  return (
    <div className="bars">
      {rows.map((r, i) => {
        const pct = Math.max(2, r.v / max * 100)
        const click = onRowClick && r.drill ? () => onRowClick(r.drill) : null
        return (
          <div className={'bar ' + (size || '') + (click ? ' clickable' : '')} key={i}
            role={click ? 'button' : undefined} onClick={click || undefined}
            title={click ? 'Open these users' : undefined}>
            <div className="name" title={r.name}>{r.name}</div>
            <div className="track"><span className="fill" style={{ width: pct + '%', background: r.color || C.blue }} /></div>
            <div className="val">{r.label !== undefined ? r.label : fmt(r.v)}{r.sub && <small> {r.sub}</small>}</div>
          </div>
        )
      })}
    </div>
  )
}

// computed-insight banner shown under a section's lead
export function Insight({ children }) {
  return (
    <div style={{ display:'flex', gap:'9px', alignItems:'flex-start', background:'var(--blue-tint)', border:'1px solid #cfe0f5', borderRadius:'10px', padding:'10px 14px', margin:'-6px 0 20px', fontSize:'13.5px', color:'var(--ink-soft)', lineHeight:1.5 }}>
      <span style={{ flex:'0 0 auto' }}>💡</span>
      <span><b style={{ color:'var(--ink)' }}>Insight — </b>{children}</span>
    </div>
  )
}

// area + line trend with hover readout
export function AreaTrend({ data }) {
  const [hi, setHi] = useState(null)
  const n = data.length, W = 1140, H = 260, pad = 26, max = Math.max(...data) * 1.08
  const x = i => pad + i * (W - 2 * pad) / (n - 1)
  const y = v => H - pad - (v / max) * (H - 2 * pad)
  let d = `M${x(0)},${y(data[0])}`
  data.forEach((v, i) => { if (i) d += `L${x(i)},${y(v)}` })
  const area = `${d}L${x(n - 1)},${H - pad}L${x(0)},${H - pad}Z`
  const grid = []
  for (let g = 0; g <= 3; g++) {
    const yy = pad + g * (H - 2 * pad) / 3
    grid.push(<g key={g}><line x1={pad} y1={yy} x2={W - pad} y2={yy} stroke="#E5E8EE" /><text x={pad - 5} y={yy + 4} textAnchor="end" fontFamily="IBM Plex Mono" fontSize="10" fill="#9aa6b8">{fmt(max * (3 - g) / 3)}</text></g>)
  }
  const dateAt = i => new Date(Date.now() - (n - 1 - i) * 86400000).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
  const bw = (W - 2 * pad) / n
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="260" preserveAspectRatio="none" onMouseLeave={() => setHi(null)}>
      <defs><linearGradient id="ar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1763B8" stopOpacity=".22" /><stop offset="1" stopColor="#1763B8" stopOpacity="0" /></linearGradient></defs>
      {grid}
      <path d={area} fill="url(#ar)" />
      <path d={d} fill="none" stroke="#1763B8" strokeWidth="2" />
      {hi != null && (() => {
        const cx = x(hi), cy = y(data[hi]), tw = 116, tx = Math.min(Math.max(cx - tw / 2, pad), W - pad - tw)
        return (
          <g key="tip" pointerEvents="none">
            <line x1={cx} y1={pad} x2={cx} y2={H - pad} stroke="#1763B8" strokeOpacity=".35" />
            <circle cx={cx} cy={cy} r="4" fill="#1763B8" stroke="#fff" strokeWidth="2" />
            <rect x={tx} y={pad - 4} width={tw} height="36" rx="6" fill="#14233B" />
            <text x={tx + 9} y={pad + 9} fontFamily="IBM Plex Mono" fontSize="10" fill="#9fc0e8">{dateAt(hi)}</text>
            <text x={tx + 9} y={pad + 24} fontFamily="Inter" fontSize="12.5" fontWeight="600" fill="#fff">{fmt(data[hi])} requests</text>
          </g>
        )
      })()}
      {data.map((_, i) => <rect key={i} x={x(i) - bw / 2} y={pad} width={bw} height={H - 2 * pad} fill="transparent" onMouseEnter={() => setHi(i)} />)}
    </svg>
  )
}

// hour-of-day bars with hover readout; peak bar derived from data
export function HourBars({ data }) {
  const [hi, setHi] = useState(null)
  const W = 720, H = 220, pad = 24, max = Math.max(...data), bw = (W - 2 * pad) / 24
  const peakIdx = data.indexOf(max)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="220" onMouseLeave={() => setHi(null)}>
      {data.map((v, i) => {
        const h = (v / max) * (H - 2 * pad - 14)
        const active = hi === i
        const fill = active ? '#0f4f96' : (i === peakIdx ? C.blue : '#9fc0e8')
        return (
          <g key={i} onMouseEnter={() => setHi(i)}>
            <rect x={pad + i * bw + 2} y={H - pad - h} width={bw - 4} height={h} rx="2" fill={fill} />
            <rect x={pad + i * bw} y={pad} width={bw} height={H - 2 * pad} fill="transparent" />
            {i % 3 === 0 && <text x={pad + i * bw + bw / 2} y={H - pad + 13} textAnchor="middle" fontFamily="IBM Plex Mono" fontSize="9.5" fill="#9aa6b8">{i}</text>}
          </g>
        )
      })}
      {hi != null && (() => {
        const cx = pad + hi * bw + bw / 2, tw = 104, tx = Math.min(Math.max(cx - tw / 2, 0), W - tw)
        return (
          <g key="tip" pointerEvents="none">
            <rect x={tx} y="2" width={tw} height="34" rx="6" fill="#14233B" />
            <text x={tx + 9} y="15" fontFamily="IBM Plex Mono" fontSize="10" fill="#9fc0e8">{String(hi).padStart(2, '0')}:00 UTC</text>
            <text x={tx + 9} y="29" fontFamily="Inter" fontSize="12" fontWeight="600" fill="#fff">{fmt(data[hi])} req</text>
          </g>
        )
      })()}
      <text x={W - pad} y="14" textAnchor="end" fontFamily="IBM Plex Mono" fontSize="9.5" fill="#9aa6b8">UTC hour →</text>
    </svg>
  )
}

// page-flow sankey; hover a link for volume, click a node to drill into its users
export function Sankey({ links, onDrill }) {
  const [ins, setIns] = useState(null)
  const cols = { Home:0,'Authoring list':1,'Repository list':1,'Contract details (A)':2,'Contract details (R)':2,Signing:3,Workflow:3 }
  const nodes = {}
  links.forEach(l => { nodes[l[0]] = nodes[l[0]] || { in:0, out:0 }; nodes[l[1]] = nodes[l[1]] || { in:0, out:0 }; nodes[l[0]].out += l[2]; nodes[l[1]].in += l[2] })
  nodes['Authoring list'].in = Math.max(nodes['Authoring list'].in, 300)
  nodes['Repository list'].in = Math.max(nodes['Repository list'].in, 250)
  const H = 360, colX = [20, 180, 355, 500], scale = 0.40
  const colNodes = { 0:[], 1:[], 2:[], 3:[] }
  Object.keys(nodes).forEach(n => colNodes[cols[n]].push(n))
  const pos = {}
  Object.keys(colNodes).forEach(c => { let y = 14; colNodes[c].forEach(n => { const h = Math.max(20, Math.max(nodes[n].in, nodes[n].out) * scale); pos[n] = { x: colX[c], y, h, c: +c }; y += h + 26 }) })
  const colName = { 'Contract details (A)':'Contract details', 'Contract details (R)':'Contract details' }
  const ncol = { Home:C.slate,'Authoring list':C.blue,'Repository list':C.merlin,'Contract details (A)':C.blue,'Contract details (R)':C.merlin,Signing:C.green,Workflow:C.amber }
  const used = {}
  const paths = links.map((l, i) => {
    const a = pos[l[0]], b = pos[l[1]], w = l[2] * scale
    used[l[0]] = used[l[0]] || 0; used[l[1]] = used[l[1]] || 0
    const y1 = a.y + used[l[0]] + w / 2, y2 = b.y + used[l[1]] + w / 2
    used[l[0]] += w; used[l[1]] += w
    const x1 = a.x + 14, x2 = b.x, mx = (x1 + x2) / 2
    return <path key={i} d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`} fill="none" stroke={ncol[l[0]]} strokeOpacity=".28" strokeWidth={Math.max(2, w)}
      style={{ cursor:'help' }}
      onMouseEnter={() => setIns({ title:`${colName[l[0]]||l[0]} → ${colName[l[1]]||l[1]}.`, body:`${l[2]} sessions on this transition.` })}
      onMouseLeave={() => setIns(null)} />
  })
  const rects = Object.keys(pos).map((n, i) => {
    const p = pos[n], lx = p.c === 3 ? p.x - 6 : p.x + 20, anc = p.c === 3 ? 'end' : 'start', sk = NODE_STAGE[n]
    return <g key={i} style={{ cursor:'pointer' }}
      onClick={() => onDrill && onDrill({ label: STAGE[sk].label, stages:[sk] })}
      onMouseEnter={() => setIns({ title: STAGE[sk].label + '.', body: STAGE[sk].insight + ' Click to open these users.' })}
      onMouseLeave={() => setIns(null)}>
      <rect x={p.x} y={p.y} width="14" height={p.h} rx="3" fill={ncol[n]} />
      <text x={lx} y={p.y + p.h / 2 - 1} textAnchor={anc} fontFamily="Inter" fontSize="11" fontWeight="600" fill="#33445E">{colName[n] || n}</text>
    </g>
  })
  return (
    <div>
      <svg viewBox="0 0 560 360" width="100%" height="360">{paths}{rects}</svg>
      <InsightStrip insight={ins} prompt="Hover a flow for its volume. Click a node to open those users." />
    </div>
  )
}

// funnel rows; hover for the insight, click to drill into the users behind a step
export function Funnel({ rows, max, colors, onDrill }) {
  const [hi, setHi] = useState(null)
  const cur = hi != null ? rows[hi] : null
  return (
    <div>
      <div className="funnel">
        {rows.map((s, i) => (
          <button className={'fstep' + (hi === i ? ' on' : '')} key={i}
            onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(null)} onFocus={() => setHi(i)} onBlur={() => setHi(null)}
            onClick={() => onDrill && onDrill({ label: STAGE[s.k].label, stages:[s.k] })}>
            <div className="fl">{s.label}</div>
            <div><span className="fbar" style={{ width: Math.max(14, s.pct / max * 100) + '%', background: colors[i] }}>{s.main}</span><span className="fmeta">{s.sub}</span></div>
          </button>
        ))}
      </div>
      <InsightStrip insight={cur && { title: STAGE[cur.k].label + '.', body: STAGE[cur.k].insight + ' Click to open these users.' }}
        prompt="Hover a step for the insight. Click to open the users behind it." />
    </div>
  )
}

// session step list, reused inside a user row's expanded detail
function Steps({ steps }) {
  return (
    <div className="tl">
      {steps.map((s, i) => (
        <div className={'tev ' + (s[3] > 0 ? 'err' : '')} key={i}>
          <div className="tt">{s[0]} UTC</div>
          <div className="tp">{s[1]}</div>
          <div className="td"><b>{s[2]}</b>{s[3] > 0 && <> · <span className="e">{s[3]} err</span></>}</div>
        </div>
      ))}
    </div>
  )
}

// searchable user table with funnel/flow filter banner and per-user deep-dive
export function UserExplorer({ users, journeys, filter, q, setQ, onClear }) {
  const [open, setOpen] = useState(null)
  const jmap = {}; journeys.forEach(j => { jmap[j.n] = j })
  const ql = q.trim().toLowerCase()
  const rows = users.filter(u =>
    (!filter || filter.stages.every(s => u.stages.includes(s))) &&
    (!ql || (u.n + ' ' + u.t + ' ' + u.r + ' ' + u.e).toLowerCase().includes(ql))
  )
  const toggle = i => setOpen(open === i ? null : i)
  return (
    <div className="card">
      <div className="explorer-bar">
        <input className="search" placeholder="Search by name, tenant or role…" value={q} onChange={e => setQ(e.target.value)} />
        <span className="count">{rows.length} of {users.length} users</span>
      </div>
      {filter && (
        <div className="filter-banner">
          <span>Filtered from Funnel &amp; Flows · <b>{filter.label}</b></span>
          <button onClick={onClear}>Clear filter ✕</button>
        </div>
      )}
      <div style={{ overflowX:'auto' }}>
        <table className="utable">
          <thead><tr>
            <th></th><th>User</th><th>Tenant</th><th>Primary roles</th>
            <th style={{ textAlign:'right' }}>Views</th><th style={{ textAlign:'right' }}>Active</th><th style={{ textAlign:'right' }}>Errors</th>
          </tr></thead>
          <tbody>
            {rows.map((u) => {
              const i = users.indexOf(u), isOpen = open === i, j = jmap[u.n]
              return (
                <Fragment key={i}>
                  <tr className={'urow' + (isOpen ? ' open' : '')} onClick={() => toggle(i)}>
                    <td className="chev">{isOpen ? '▾' : '▸'}</td>
                    <td><b style={{ color:'var(--ink)' }}>{u.n}</b><br/><span className="mono" style={{ fontSize:'10.5px', color:'var(--muted)' }}>{u.e}</span></td>
                    <td>{u.t}</td>
                    <td style={{ fontSize:'12px' }}>{u.r}</td>
                    <td className="num">{u.v}</td>
                    <td className="num">{u.a}</td>
                    <td className="num">{u.err > 100 ? <span className="tag bad">{u.err}</span> : u.err}</td>
                  </tr>
                  {isOpen && (
                    <tr className="udetail"><td colSpan={7}>
                      <div className="udetail-in">
                        <div className="stage-chips">
                          {u.stages && u.stages.length
                            ? u.stages.map(s => <span className="chip-mini" key={s}>{STAGE[s] ? STAGE[s].label : s}</span>)
                            : <span className="chip-mini">No lifecycle stage recorded</span>}
                        </div>
                        {j
                          ? (<><p className="jsum">{j.sum}</p><Steps steps={j.steps} /></>)
                          : (
                            <div style={{ display:'flex', flexWrap:'wrap', gap:'18px', fontSize:'12.5px', color:'var(--ink-soft)', marginTop:'2px' }}>
                              <span><b style={{ color:'var(--ink)' }}>{u.sessions ?? '—'}</b> sessions</span>
                              <span><b style={{ color:'var(--ink)' }}>{u.v}</b> views</span>
                              <span><b style={{ color:'var(--ink)' }}>{u.a}</b> active</span>
                              <span><b style={{ color: u.err > 100 ? 'var(--red)' : 'var(--ink)' }}>{u.err}</b> errors</span>
                              {u.country && <span>📍 {u.country}</span>}
                              {u.device && <span>🖥 {u.device}</span>}
                            </div>
                          )}
                      </div>
                    </td></tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && (
        users.length === 0
          ? <div className="empty">No live user data loaded. This populates from <span className="mono">/api/rum</span> on the deployed site; running locally requires <span className="mono">vercel dev</span> (plain <span className="mono">vite</span> can't run the serverless API).</div>
          : <div className="empty">No users match {filter ? 'this funnel filter' : 'your search'}. <button className="linkbtn" onClick={() => { setQ(''); onClear() }}>Reset</button></div>
      )}
    </div>
  )
}

export function Section({ kicker, title, flag, lead, children }) {
  return (
    <section>
      {kicker && <div className="kicker">{kicker}</div>}
      <h2>{title}{flag && <span className={'winflag ' + flag.cls}>{flag.label}</span>}</h2>
      {lead && <p className="lead" dangerouslySetInnerHTML={{ __html: lead }} />}
      {children}
    </section>
  )
}
