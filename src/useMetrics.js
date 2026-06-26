import { useEffect, useState } from 'react'

// Fetches live backend (APM) metrics from the serverless /api/metrics on mount.
// status: 'loading' until the request settles, then 'live' or 'snapshot' (fallback).
export function useMetrics() {
  const [m, setM] = useState(null)
  const [status, setStatus] = useState('loading')
  useEffect(() => {
    let on = true
    fetch('/api/metrics')
      .then(r => r.ok ? r.json() : Promise.reject(new Error('http ' + r.status)))
      .then(d => { if (on && d && !d.error) { setM(d); setStatus('live') } else if (on) setStatus('snapshot') })
      .catch(() => { if (on) setStatus('snapshot') })
    return () => { on = false }
  }, [])
  return { m, status }
}
