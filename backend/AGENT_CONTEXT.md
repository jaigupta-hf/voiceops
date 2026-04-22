# Agent Context for VoiceOps Backend

## Purpose

This file gives AI coding agents a fast, reliable mental model of the backend so changes can be made safely and consistently.

## Core Responsibilities

- Ingest Twilio Voice event stream webhooks.
- Normalize incoming payloads into CallEvent and ErrorEvent rows.
- Provide list, stats, and trace APIs for frontend dashboard consumption.
- Stream newly ingested events to clients via WebSocket.
- Handle Google OAuth sign-in and JWT token issuance.

## Key Files and Ownership

- voiceops/settings.py
  - Database, JWT, CORS, Channels/Redis config.
- voiceops/urls.py
  - Mounts API and webhook URL trees.
- voiceops/asgi.py
  - Routes HTTP and websocket protocols.
- events/views.py
  - Read-only API viewsets + webhook endpoint.
- events/models.py
  - CallEvent and ErrorEvent schemas.
- events/serializers.py
  - DTO shape for list endpoints and websocket payloads.
- events/utilities/event_processing.py
  - Event type dispatch into DB create handlers.
- events/utilities/call_trace.py
  - call-trace and conference-trace builders.
- events/integrations/slack.py
  - Slack posting helpers for operational visibility.
- authentication/views.py
  - Google auth, user info, logout.

## End-to-End Data Flow

1. Twilio sends POST payload to or /webhooks/twilio-events.
2. events/views.py inspects each event and routes by type.
3. events/utilities/event_processing.py creates CallEvent or ErrorEvent records.
4. Newly created events are serialized and broadcast to channel group twilio_events.
5. WebSocket clients connected at /ws/events/ receive realtime updates.
6. Frontend also fetches historical data and traces through REST endpoints.

## Current Design Patterns

- Router-style dispatch for event processing based on event type marker substrings.
- Read-only DRF viewsets for dashboard retrieval APIs.
- Trace formatting via parser dispatcher map in call_trace.py.
- Dedicated stats actions for daily aggregates.
- Defensive cap for no_pagination=true responses (1000 rows).

## Performance and Behavior Notes

- Call list endpoint deduplicates by call_sid when not searching.
- PostgreSQL dedup path uses distinct by call_sid; non-PostgreSQL uses subquery fallback.
- build_call_trace now computes header source, final status, participant label, and event formatting in a single pass over loaded call events.
- Login Slack notification in authentication flow is non-blocking via daemon thread dispatch.

## Operational Dependencies

- PostgreSQL: primary DB.
- Redis: channel layer backend for websocket group messaging.
- Slack API: non-critical notifications.
- Google token verification endpoint: required for auth login.

## Environment Variables to Know

- SECRET_KEY
- GOOGLE_OAUTH_CLIENT_ID
- DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_CONN_MAX_AGE
- SLACK_BOT_TOKEN, CHANNEL_ID
- TWILIO_AUTH_TOKEN (for webhook signature validation path if enabled)

## Safe Change Guidelines for Agents

- Preserve API response contracts used by frontend panels and trace modal.
- Keep event_type routing backward-compatible; add handlers rather than replacing broad matching blindly.
- Avoid introducing blocking external I/O in request-critical paths.
- Maintain cap logic for unpaginated requests to prevent large memory spikes.
- When touching trace format, verify both call-trace and conference-trace consumers in frontend.
- Prefer additive changes with clear fallbacks for non-PostgreSQL compatibility.

## Quick Validation Commands

- ./venv/bin/python manage.py check
- ./venv/bin/python manage.py migrate --plan
- ./venv/bin/python manage.py test

## Known Gaps and Follow-Ups

- requirements.txt may not list all runtime packages used by settings (channels stack).
- Webhook signature validation exists but is currently commented out in views.
- Slack integration still performs synchronous HTTP calls in some event paths.
