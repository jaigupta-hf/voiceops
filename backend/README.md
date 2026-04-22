# VoiceOps Backend

Django backend for ingesting Twilio Voice Event Streams, storing call and error events, exposing REST APIs for dashboards, and broadcasting realtime updates over WebSocket.

## What This Service Does

- Receives Twilio webhook events at a single ingestion endpoint.
- Normalizes events into relational models:
  - CallEvent for call and conference lifecycle events.
  - ErrorEvent for Twilio error events.
- Serves REST APIs for:
  - Event lists with search/ordering/pagination.
  - Trace endpoints for full call and conference timelines.
  - Daily stats endpoints used by frontend widgets.
- Provides Google OAuth based sign-in flow and JWT token issuance.
- Pushes selected operational notifications to Slack.
- Broadcasts newly ingested events to connected frontend clients via Channels WebSocket.

## High-Level Architecture

- Django + DRF for REST APIs.
- PostgreSQL for primary storage.
- Django Channels + Redis channel layer for realtime event fanout.
- SimpleJWT for access and refresh tokens.
- Google token verification for auth entry point.

Main apps:
- authentication: OAuth verification, JWT responses, user info endpoints.
- events: webhook ingestion, event models, trace construction, realtime streaming.

## Project Layout

- voiceops/settings.py: Django, DB, JWT, CORS, Channels settings.
- voiceops/urls.py: top-level API and webhook route mounting.
- voiceops/asgi.py: HTTP + WebSocket protocol router.
- events/models.py: CallEvent and ErrorEvent schema.
- events/views.py: webhook endpoint + read-only API viewsets + trace/stats actions.
- events/utilities/event_processing.py: event type router and DB create logic.
- events/utilities/call_trace.py: timeline formatting and trace assembly.
- events/consumers.py: websocket group consumer.
- authentication/views.py: Google auth, user info, logout.

## Environment Variables

Core:
- SECRET_KEY
- GOOGLE_OAUTH_CLIENT_ID

Database:
- DB_NAME
- DB_USER
- DB_PASSWORD
- DB_HOST
- DB_PORT
- DB_CONN_MAX_AGE

Slack:
- SLACK_BOT_TOKEN
- CHANNEL_ID

Optional/ops:
- TWILIO_AUTH_TOKEN (signature validation path exists in code but is currently commented)

## Local Run

1. Install dependencies from requirements.txt.
2. Ensure PostgreSQL is running and env vars are configured.
3. Run migrations.
4. Start Redis for channel layer support.
5. Start Django app using ASGI-capable server.

Typical commands:
- ./venv/bin/python manage.py migrate
- ./venv/bin/python manage.py check
- ./venv/bin/python manage.py runserver

## Notes

- Call listing endpoint applies dedup logic by call_sid for non-search requests.
- For no_pagination=true, backend enforces MAX_NO_PAGINATION_RESULTS=1000.
- Login Slack notification is dispatched in a fire-and-forget daemon thread so user auth responses are not blocked by Slack latency.

For endpoint details, see API_DOCS.md.
For AI-oriented codebase guidance, see AGENT_CONTEXT.md.
