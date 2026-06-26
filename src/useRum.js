import { useEffect, useState } from 'react'
import { authHeaders } from './auth.js'

// Fetches the live RUM cohort + funnel + breakdowns from /api/rum on mount.
// The customer data lives only behind this endpoint, never in the bundle.
export function useRum() {
  const [r, setR] = useState(null)
  const [status, setStatus] = useState('loading')
  useEffect(() => {
    let on = true
    fetch('/api/rum', { headers: authHeaders() })
      .then(res => res.ok ? res.json() : Promise.reject(new Error('http ' + res.status)))
      .then(d => { if (on && d && !d.error) { setR(d); setStatus('live') } else if (on) setStatus('unavailable') })
      .catch(() => { if (on) setStatus('unavailable') })
    return () => { on = false }
  }, [])
  return { r, status }
}
