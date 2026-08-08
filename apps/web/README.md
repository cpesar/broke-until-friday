The intended architecture (2 apps):

1. apps/api — an Express server (with better-auth, Drizzle/Postgres, Plaid). Deployed via apps/api/vercel.json, which points Vercel's @vercel/node builder at api/index.ts and routes everything there. This is https://budget-app-api-neho.vercel.app.
2. apps/web — the React/Vite frontend. Deployed via apps/web/vercel.json, which does two rewrites:

- /api/:path* → proxied straight through to https://budget-app-api-neho.vercel.app/api/:path* (so the browser only ever talks to one origin — the web app's domain — even though requests are actually served by the separate API deployment)
- everything else → /index.html (SPA fallback for client-side routing)

So in production, the browser only ever hits the web domain. Vercel's rewrite silently forwards /api/\* calls to the api project behind the scenes — same mechanism as the Vite dev proxy locally (server.proxy["/api"] → localhost:3001), just done at Vercel's edge instead of in Vite.
