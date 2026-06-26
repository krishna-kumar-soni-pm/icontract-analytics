import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Dev-only: serve the /api serverless functions locally so `vite` behaves like Vercel.
// In production these run as real Vercel serverless functions; this middleware is never bundled.
function devApi(env) {
  return {
    name: 'dev-api',
    configureServer(server) {
      process.env.DD_API_KEY = env.DD_API_KEY
      process.env.DD_APP_KEY = env.DD_APP_KEY
      process.env.DD_SITE = env.DD_SITE || 'datadoghq.com'
      server.middlewares.use(async (req, res, next) => {
        const match = req.url && req.url.match(/^\/api\/(metrics|rum)(\?|$)/)
        if (!match) return next()
        try {
          const mod = await server.ssrLoadModule(`/api/${match[1]}.js`)
          const shim = {
            _s: 200,
            setHeader: () => {},
            status(c) { this._s = c; return this },
            json(o) { res.statusCode = this._s; res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(o)) },
          }
          await mod.default(req, shim)
        } catch (e) {
          res.statusCode = 500
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ error: String(e && e.message || e) }))
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return { plugins: [react(), devApi(env)] }
})
