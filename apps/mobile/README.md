# mobile (placeholder)

Not built yet. This will be a React Native + Expo app added in a later phase, once the web app and API are stable.

It will:
- Reuse `@budget-app/shared` for types, zod schemas, budget-progress logic, and the API client.
- Reuse the same Better Auth instance as `apps/api`, via Better Auth's Expo plugin for the OAuth deep-link flow.
- Add Sign in with Apple before any App Store submission (required once other social logins are offered).
