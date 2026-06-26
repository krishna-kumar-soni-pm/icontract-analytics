// All metrics sourced from Datadog (US1, org Zycus).
// Backend (APM, icontract-backend-api): L90D. User-level (RUM, DewDrops-iContract): L30D (retention limit).

export const C = { blue:'#1763B8', merlin:'#6B45E6', green:'#1C8C58', amber:'#B5740E', red:'#C0392B', slate:'#62718A' }

// Canonical lifecycle stages. Funnel steps, flow nodes and user records all
// reference these keys, so any chart can drill into the exact users behind it.
export const STAGE = {
  open:      { label:'Open contract',      insight:'495 of 812 users open a contract detail. Every major path runs through this hub.' },
  authoring: { label:'Browse authoring',   insight:'355 users browse authoring, the widest entry surface in the product.' },
  repository:{ label:'Repository',         insight:'349 users work the repository, the parallel spine to authoring.' },
  workflow:  { label:'Workflow / Review',  insight:'134 users reach workflow or review.' },
  home:      { label:'Landing / Home',     insight:'60 users have a recorded Home landing before navigating in.' },
  signoff:   { label:'Sign-off',           insight:'Only 23 users reach sign-off in the sampled window, the rarest stage.' },
}
// node label -> stage key, for the flow Sankey
export const NODE_STAGE = { Home:'home','Authoring list':'authoring','Repository list':'repository','Contract details (A)':'open','Contract details (R)':'open',Signing:'signoff',Workflow:'workflow' }

export const kpis = [
  { v:'112M', l:'Backend requests (L90D, prod)', t:'≈124M exact-window', c:'neutral' },
  { v:'0.019%', l:'Server error rate', t:'21,082 errors · healthy', c:'up' },
  { v:'~320 ms', l:'Avg API latency (90d)', t:'76 to 406ms by region', c:'up' },
  { v:'+6%', l:'MoM growth (39.9M→42.3M)', t:'demand rising', c:'up' },
  { v:'Tue · 13–15h', l:'Peak day & hour (UTC)', t:'weekdays 2.8× weekend', c:'neutral' },
  { v:'86', l:'Active tenants (30d RUM)', t:'812 named users', c:'neutral' },
]

// 90 daily totals (prod, 6 regions summed), oldest first
export const dailyTrend = [483325,649671,1791444,2269063,2000058,1418517,991445,436415,384120,1222169,1863209,1697534,1722333,1428322,679657,546968,1500136,1571021,1784579,1610010,1159666,299697,566084,1706406,1656648,1669430,1811138,1404029,309798,653081,1731464,1804974,1778104,1785111,1141246,435501,627513,1621764,1743221,1595559,1755895,1394971,456512,727806,1654920,1836491,1761324,1903402,1639416,908244,1463815,1810793,1671807,1818398,1732000,1520165,531874,854969,1244349,1675017,1364002,1560970,1432505,882172,889353,1593614,1677698,1649361,1513615,1341687,554655,620046,1510050,1976983,1883185,1769571,1637215,1011889,1335804,1863009,1969987,1825371,1980711,1412614,598705,963266,2000078,2002791,1973048,885515]

// requests by hour-of-day UTC (US+EU+SG prod)
export const hours = [2165667,3266932,3313065,2663247,1849449,2504423,3360976,4614187,4580909,4609767,3879047,3970264,4732454,6270333,5915920,6390755,5373658,4900005,4225805,3978441,3375457,2278008,1265459,1681231]

export const weekday = [['Mon',16328587],['Tue',17825643],['Wed',17022522],['Thu',16013251],['Fri',12271116],['Sat',4909086],['Sun',6795252]]

export const regionVol = [['Prod US (prus)',38157919,'34%'],['Prod EU (euprdc)',28451778,'25%'],['Prod AU (auprdc)',16831595,'15%'],['Prod SG (sgprdc)',15720770,'14%'],['Prod AU (aust1)',10683719,'10%'],['Prod NV (nvprdc)',2099689,'2%']]

export const regionTbl = [
  ['Prod US','38.2M','0.017%',396,'ok'],['Prod EU','28.5M','0.015%',299,'ok'],['Prod AU·1','16.8M','0.009%',171,'ok'],
  ['Prod SG','15.7M','0.032%',406,'warn'],['Prod AU·2','10.7M','0.033%',256,'warn'],['Prod NV','2.1M','0.001%',76,'ok'],
]

// funnel rows reference a stage key so each step can drill into its users.
// pct drives bar width (0-100); main is the headline %, sub the absolute count.
export const stageReach = [
  { k:'open',       label:'Open contract',     pct:61, main:'61%', sub:'495 users' },
  { k:'authoring',  label:'Browse authoring',  pct:44, main:'44%', sub:'355 users' },
  { k:'repository', label:'Repository',        pct:43, main:'43%', sub:'349 users' },
  { k:'workflow',   label:'Workflow / Review', pct:16, main:'16%', sub:'134 users' },
  { k:'home',       label:'Landing / Home',    pct:7,  main:'7%',  sub:'60 users' },
  { k:'signoff',    label:'Sign-off',          pct:3,  main:'3%',  sub:'23 users' },
]
export const seqFunnel = [
  { k:'open',     label:'Opened a contract', pct:100, main:'100%', sub:'72 sessions' },
  { k:'workflow', label:'reached Workflow',  pct:28,  main:'28%',  sub:'20 sessions' },
  { k:'signoff',  label:'reached Sign-off',  pct:4,   main:'4%',   sub:'3 sessions' },
]

export const sankeyLinks = [
  ['Home','Authoring list',230],['Home','Repository list',123],['Authoring list','Contract details (A)',247],
  ['Repository list','Contract details (R)',153],['Contract details (A)','Signing',112],['Contract details (A)','Workflow',78],
]

// each transition carries the two stages it spans, so a click filters users who touched both
export const transitions = [
  { label:'Authoring list → Contract details', v:247, stages:['authoring','open'] },
  { label:'Home → Authoring list', v:230, stages:['home','authoring'] },
  { label:'Repository list → Contract details', v:153, stages:['repository','open'] },
  { label:'Home → Repository list', v:123, stages:['home','repository'] },
  { label:'Contract details → Signing', v:112, stages:['open','signoff'] },
  { label:'Contract details → Authoring list', v:83, stages:['open','authoring'] },
  { label:'Contract details (R) → Repository list', v:83, stages:['open','repository'] },
  { label:'Contract details → Workflow', v:78, stages:['open','workflow'] },
  { label:'Signing → Contract details', v:43, stages:['signoff','open'] },
  { label:'Workflow → Contract details', v:26, stages:['workflow','open'] },
]

export const sessionKpis = [
  { v:'640', l:'Sessions analysed' },{ v:'4.7', l:'Views / session' },{ v:'4m 27s', l:'Median duration' },
  { v:'27', l:'Actions / session' },{ v:'20%', l:'Bounce (1-view)' },{ v:'3,000', l:'View events merged' },
]
export const entryPages = [['Authoring list',199],['Repository list',144],['Contract details (A)',69],['Approvals & reviews',58],['Contract details (R)',51],['Workflow',16]]
export const exitPages = [['Contract details (R)',121],['Contract details (A)',98],['Repository list',97],['Authoring list',72],['Approvals & reviews',55],['Signing',37]]

// The user cohort is served live from /api/rum (never bundled / never in the repo).
// These are empty fallbacks for when the API is unreachable (e.g. local dev without serverless).
export const users = []

export const roles = [['Contract Author',106],['Contract Reviewer',106],['Contract Manager',87],['Purchase Manager',84],['Word Connect',31],['Legal',25],['Contract Admin',24],['Customer Admin',11]]

// Per-user session deep-dives are reconstructed live; no named individuals are stored here.
export const journeys = []

export const spine = [['01','Create','Min',8,C.blue],['02','Author','High',70,C.blue],['03','Review','High',85,C.blue],['04','Negotiate','Med*',55,C.blue],['05','Sign','High',80,C.green],['06','Repository','Med',55,C.merlin],['07','Obligate','~0',3,C.merlin],['08','Renew','Low',12,C.merlin]]

export const areaEngagement = [['Negotiate*',1888,C.amber],['Dashboard / Home',823,C.blue],['Sign-off',763,C.blue],['Approvals / Review',718,C.blue],['Clauses',616,C.blue],['Repository',541,C.merlin],['Authoring',470,C.blue],['Templates',447,C.blue],['Obligations',1,C.red],['Risk Monitor',1,C.red]]

export const perfLcp = [['Negotiate',2441,C.amber],['Authoring',1665,C.green],['Sign-off',1430,C.green],['Approvals',1417,C.green],['Clauses',1390,C.green],['Repository',1363,C.green],['Templates',1150,C.green],['Home',1142,C.green]]

export const vitals = [
  ['First Contentful Paint (avg)','564 ms','ok','Good'],
  ['Largest Contentful Paint (avg)','1,804 ms','ok','Good'],
  ['DOM Complete (avg)','1,032 ms','ok','Good'],
  ['Worst area · Negotiate (LCP)','2,441 ms','warn','Watch'],
  ['Slow tail (max LCP)','26,080 ms','bad','Tail'],
]

export const errSignatures = [['RxJS: stream expected, got undefined',33,'warn','Framework'],['Deprecated Tooltip (use Qtip)',23,'ok','Deprecation'],['ngIfThen: not a TemplateRef',21,'ok','Template'],['initErrorLogger no longer required',14,'ok','Deprecation'],["TypeError: cannot read 'type'",7,'bad','Runtime']]
export const errPages = [['repository /…/details',65],['authoring /…/details',51],['repository list',12],['authoring list',5]]

export const aiFeatures = [['Executive Summary','warn','Faint','Action in sign-off mail'],['Risk / Insta Review','warn','Faint','Ambiguous path'],['Contract Comparator Pro','warn','Faint','Very low count'],['Nego Genie','bad','Unclear','Path collision'],['Obligation Extract','bad','None','No signal'],['Ask AI','bad','None','No signal'],['Contract Discovery','bad','None','No signal']]

// Tenant / geography / browser breakdowns are served live from /api/rum (customer identities
// are not hardcoded in the repo). Empty fallbacks for offline/local dev.
export const tenants = []
export const geo = []
export const browsers = []
