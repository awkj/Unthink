# Self-hosted synchronization

Tasks remains local-first. Web stores its working copy in IndexedDB, native
clients use their application data directory, and PostgreSQL stores opaque
Loro changes used to synchronize those copies.

## Client metadata

Each configured device persists:

- a stable client ID;
- the last fully consumed server revision;
- the last compacted snapshot revision;
- the Loro version vector known to be present on the server.

## Synchronization cycle

One synchronization cycle is serialized per client:

1. Pull changes after the local server revision.
2. Import snapshots and changes into the local Loro document.
3. Export and upload the local patch not covered by the known server version.
4. Pull once more to close the race with other devices.
5. After 100 revisions, upload a snapshot that covers the consumed revision.

Uploads use a unique `clientId + changeId` pair, so retrying a request is
idempotent.

## Automatic triggers

- 500 milliseconds after a local change;
- application startup;
- an authenticated server-sent event after another client commits a revision;
- every 60 seconds while the application is open as a fallback;
- browser focus or visibility restoration;
- network restoration;
- Tauri application resume.

The event stream carries only the committed revision and clients still use the
normal changes endpoint to retrieve data. It reconnects with exponential
backoff up to 30 seconds and sends a heartbeat every 25 seconds. Synchronization
failures use exponential backoff from two seconds up to one minute. Manual
synchronization remains available and waits for any running synchronization
cycle instead of starting a competing request.

## Server responsibility

The Go server authenticates the single user, assigns monotonic revisions,
stores changes transactionally, and compacts covered changes. It deliberately
does not parse or merge Loro data; merging remains on clients. Revision events
are broadcast by the API process after the database transaction commits. Space
names are trimmed and normalized to lowercase by both clients and the server,
so names such as `Tasks` and `tasks` refer to the same sync space.
