import { useEffect, useState } from 'react'
import { authHeaders } from './auth.js'

// Fetches live backend (APM) metrics from /api/metrics on mount.
// status: 'loading' until the request settles, then 'live' or 'snapshot' (fallback).
export function useMetrics() {
  const [m, setM] = useState(null)
  const [status, setStatus] = useState('loading')
  useEffect(() => {
    let on = true
    fetch('/api/metrics', { headers: authHeaders() })
      .then(r => r.ok ? r.json() : Promise.reject(new Error('http ' + r.status)))
      .then(d => { if (on && d && !d.error) { setM(d); setStatus('live') } else if (on) setStatus('snapshot') })
      .catch(() => { if (on) setStatus('snapshot') })
    return () => { on = false }
  }, [])
  return { m, status }
}
