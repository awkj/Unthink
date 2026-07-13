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

- two seconds after a local change;
- application startup;
- every 15 seconds while the application is open;
- browser focus or visibility restoration;
- network restoration;
- Tauri application resume.

Failures use exponential backoff from two seconds up to one minute. Manual
synchronization remains available and waits for any running synchronization
cycle instead of starting a competing request.

## Server responsibility

The Go server authenticates the single user, assigns monotonic revisions,
stores changes transactionally, and compacts covered changes. It deliberately
does not parse or merge Loro data; merging remains on clients.
