# Five-Minute Walkthrough Video Outline

1. Problem and architecture: explain HappyRobot as the voice layer and this app
   as the broker-owned API, policy, storage, and dashboard layer.
2. HappyRobot web-call setup: show the web-call trigger, Maya persona, tool
   calls, AI Extract, AI Classify, and `/api/calls` webhook.
3. Carrier call: run one successful carrier flow with MC verification, load
   pitch, counteroffer, acceptance, and the mock transfer line.
4. Dashboard metrics: show total calls, eligible rate, matched loads, agreement
   rate, outcome chart, conversion chart, recent calls, offer history, and the
   Convex live query updating the dashboard.
5. Deployment and security: show Railway URL, Docker/Railway config,
   Convex/Confect backend, server-only secrets, API key auth, and dashboard
   Basic auth.
