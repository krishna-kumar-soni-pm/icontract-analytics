# iContract Product Analytics

Live product-analytics dashboard for **iContract** (Zycus CLM), sourced from Datadog.

- **Backend (APM)** metrics: live via `/api/metrics` (last 90 days).
- **User-level (RUM)** cohort, funnel, adoption: live via `/api/rum` (last ~30 days).
- Built with Vite + React. Datadog keys are server-side env vars (`DD_API_KEY`, `DD_APP_KEY`, `DD_SITE`).

No customer data is stored in this repo or shipped in the client bundle — it is fetched at
request time from Datadog by the serverless functions and cached. Emails are masked; Zycus
internal QA/bot accounts are excluded.
