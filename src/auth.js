// Simple session-scoped access key. The key never lives in the bundle — the user types it,
// it's kept in sessionStorage, and sent as a header the serverless API validates.
const K = 'ic_ak'
export const getKey = () => { try { return sessionStorage.getItem(K) || '' } catch { return '' } }
export const setKey = v => { try { sessionStorage.setItem(K, v) } catch {} }
export const clearKey = () => { try { sessionStorage.removeItem(K) } catch {} }
export const authHeaders = () => ({ 'x-access-key': getKey() })
