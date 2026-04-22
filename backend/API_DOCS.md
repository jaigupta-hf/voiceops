# VoiceOps Backend API Docs

## Base Paths

- API root: /api/
- Auth root: /api/auth/
- Webhook aliases:
  - /webhooks/twilio-events

## Auth APIs

### POST /api/auth/google/

Authenticate using Google ID token and return JWT + user profile.

Request body:
- token: string (Google ID token)

Success response 200:
- access: JWT access token
- refresh: JWT refresh token
- user:
  - id
  - username
  - email
  - first_name
  - last_name

Error responses:
- 400 when serializer fails or email missing
- 401 when token is invalid
- 500 for unexpected auth failures

Notes:
- User is created if not present, otherwise profile names are updated.
- Slack login notification is sent asynchronously and does not block response.

### POST /api/auth/token/refresh/

Standard SimpleJWT refresh endpoint.

Request body:
- refresh: string

Success response 200:
- access: string

### GET /api/auth/user/

Return current authenticated user profile.

Auth:
- Bearer access token

Success response 200:
- id
- username
- email
- first_name
- last_name

### POST /api/auth/logout/

Stateless logout helper endpoint.

Auth:
- Bearer access token

Success response 200:
- message: Logged out successfully

## Call Event APIs

Viewset base: /api/call-events/

Supported query params:
- search: string (matches call_sid, from_number, to_number, account_sid)
- ordering: timestamp or created_at
- page
- page_size
- no_pagination=true

### GET /api/call-events/

List call events.

Behavior:
- If search is present: returns all matching events (no dedup).
- If search is absent: deduplicates by call_sid and returns the most relevant event per call.
  - PostgreSQL path uses distinct by call_sid with latest timestamp selection.
  - Non-PostgreSQL fallback picks completed event when available, else latest event.
- If no_pagination=true: returns up to 1000 records.

Serialized fields:
- event_id
- call_sid
- account_sid
- conference_sid
- event_type
- call_status
- direction
- from_number
- to_number
- timestamp

### GET /api/call-events/stats/

Daily call stats for current day (server timezone).

Response 200:
- by_event_type:
  - initiated
  - ringing
  - answered (maps from in-progress)
  - completed

### GET /api/call-events/call-trace/{call_sid}/

Structured timeline for one call.

Path params:
- call_sid

Success response 200:
- header:
  - call_sid
  - account_sid
  - final_status
  - direction
  - from_number
  - to_number
  - participant_label (optional)
- events: ordered list by timestamp
  - timestamp
  - event_type
  - category (call or error)
  - details (event-type specific)
  - payload (raw metadata)

Errors:
- 404 when no call events found

### GET /api/call-events/conference-trace/{conference_sid}/

Structured conference timeline.

Path params:
- conference_sid

Success response 200:
- header:
  - conference_sid
  - participant_count
  - participants: list of call_sid + optional label
  - friendly_name (optional)
  - reason_ended (optional)
  - ended_by (optional)
- events: ordered list by timestamp

Errors:
- 404 when no conference events found

## Error Event APIs

Viewset base: /api/error-events/

Supported query params:
- search: string (matches error_code, correlation_sid, account_sid)
- ordering: timestamp or created_at
- page
- page_size
- no_pagination=true

### GET /api/error-events/

List error events.

Behavior:
- Ordered newest first by default.
- If no_pagination=true: returns up to 1000 records.

Serialized fields:
- event_id
- account_sid
- correlation_sid
- error_code
- severity
- product
- error_message
- request_sid
- timestamp

### GET /api/error-events/stats/

Daily error severity histogram for current day.

Response 200:
- by_severity: object map of severity to count

## Webhook Ingestion API

### POST /api/twilio-events
### POST /webhooks/twilio-events

Accepts Twilio event streams payload (single object or array).

Processing behavior:
- Detects event type and routes to call or error processors.
- Persists normalized records.
- Broadcasts created events to WebSocket group twilio_events.
- Sends Slack notifications for error events.

Response codes:
- 204 on success
- 400 on JSON decode error
- 500 on unexpected processing error

## WebSocket API

Endpoint:
- ws://<host>/ws/events/

Message format pushed by server:
- type: call_event or error_event
- data: serialized event object

Notes:
- Client only receives server-broadcast messages; receive handler currently ignores inbound client messages.

## Authentication and Permission Notes

- JWT authentication class is configured globally.
- Event viewsets do not define explicit DRF permission classes, so access behavior follows DRF defaults for this project.
- Auth endpoints define per-view permissions explicitly.
