# Spec: `@ofsdk/net` SDK layering and hardening

Status: ready-for-agent

## Problem Statement

As a developer building a browser app on `@ofsdk/net`, the single `Endpoint`
class mixes five domain concepts that the project glossary keeps separate:
endpoint identity, mesh messaging, the peer allowlist, pairing, and byte
streams. The WASM binding underneath is even named "server", which the
glossary tells us to avoid. On top of the confusing shape, the SDK has real
footguns: calling `onMessage`, `addPeer`, `peers`, or setting `pairingEnabled`
before `ready` resolves crashes with a `TypeError`; a single failed WASM load
poisons every future endpoint on the page; using an endpoint after `close()`
fails with opaque errors; and errors from the mesh (not connected, not
allowed, payload too large) are indistinguishable strings. Delivery semantics
of broadcast vs direct message are undocumented, so `send()` failing for
non-allowlisted peers surprises users.

## Solution

Restructure the TypeScript SDK along glossary lines and harden its lifecycle:

- `Endpoint` keeps identity and lifecycle only: `ready`, `id`, `close()`, and
  the peer allowlist inventory (`peers`, `addPeer`, `removePeer`).
- A `Mesh` handle (exposed from the endpoint) owns mesh communication:
  `broadcast`, `send`, `onMessage`, and `openStream` byte streams.
- The WASM binding is renamed from `WebServer` to `MeshEndpoint` so vocabulary
  matches end to end.
- Sync methods called before `ready` are buffered and flushed once `ready`
  resolves, instead of crashing.
- A `closed` state makes `close()` idempotent and makes every later call throw
  a typed `ClosedError`; a failed init no longer produces an unhandled
  rejection.
- A failed WASM load can be retried instead of being cached as a permanent
  rejection.
- Errors cross the WASM boundary with a kind and map to a typed `MeshError`
  (`not-connected`, `not-allowed`, `payload-too-large`, `closed`, …).
- Observability is exposed where the core already supports it: peer
  allowlist change events, pairing acceptance changes, and a timed pairing
  window (`pairingEnabledFor(ms)`).
- `PairingOffer` tracks `answered`; a second `reply()` rejects with a typed
  error.
- `Stream` gains `close()` (abort) and incremental `read(limit)` alongside
  `readToEnd(limit)`.
- `broadcast` / `send` delivery semantics are documented (hop-limited flood
  with dedup for broadcast; allowlisted destination required for direct;
  self-messages delivered locally).
- The SDK entry module is split into sibling modules (wasm bindings, types,
  stream, endpoint) with a thin re-exporting entry.

## User Stories

1. As a browser app developer, I want to create an `Endpoint` and await `ready`, so that I know the endpoint is connected before I use it.
2. As a browser app developer, I want to read `endpoint.id` after `ready`, so that I can share this endpoint's identity with other peers.
3. As a browser app developer, I want to pass a secret key and relay URLs when creating an endpoint, so that I can have a stable identity or use custom relays.
4. As a browser app developer, I want to call `onMessage`, `addPeer`, read `peers`, and set `pairingEnabled` immediately after `new Endpoint()` without awaiting `ready`, so that setup code does not need to be ordered carefully and never crashes with a `TypeError`.
5. As a browser app developer, I want pending listeners and peer operations to be applied automatically once `ready` resolves, so that messages sent in the first moments are not lost.
6. As a browser app developer, I want to `broadcast` bytes to the whole mesh, so that every endpoint receives the message directly or through relays.
7. As a browser app developer, I want to `send` bytes to one peer by `EndpointId`, so that only that endpoint receives the direct message.
8. As a browser app developer, I want `send` to a peer that is not in my allowlist to fail with a clear `not-allowed` error, so that I understand the allowlist requirement instead of seeing an opaque string.
9. As a browser app developer, I want to receive incoming messages through `onMessage` with source, destination (null for broadcasts), and payload, so that I can react to both broadcasts and direct messages.
10. As a browser app developer, I want `onMessage` to return an unsubscribe function, so that I can stop listening when a component unmounts.
11. As a browser app developer, I want to see my peer allowlist via `peers` and manage it with `addPeer` / `removePeer`, so that I control which endpoint identities my endpoint trusts and routes to.
12. As a browser app developer, I want an `onPeersChanged` event when the allowlist inventory changes, so that my UI can reflect the current peer set without polling.
13. As a browser app developer, I want the docs to state clearly that `peers` is the allowlist inventory and not live connection state, so that I do not misread it as "currently connected".
14. As a browser app developer, I want to toggle pairing mode with `pairingEnabled`, so that I can accept pairing offers only when I choose to.
15. As a browser app developer, I want a timed pairing window via `pairingEnabledFor(ms)`, so that pairing is open only for a short UX window and closes itself.
16. As a browser app developer, I want an event when pairing acceptance changes (enabled, disabled, expired), so that my UI can show the current acceptance state.
17. As a browser app developer, I want to `pair(to, bytes)` and receive the peer's reply bytes, so that I can run a challenge/response handshake to establish trust.
18. As a browser app developer, I want `onPairingOffer` to hand me an offer with the remote id, payload, and a `reply` function, so that I can answer incoming pairing requests.
19. As a browser app developer, I want a second `reply()` on the same offer to reject with a typed error and the offer to expose `answered`, so that I never double-answer an offer by mistake.
20. As a browser app developer, I want to open a bidirectional byte `Stream` to a peer with `openStream`, so that I can move larger or continuous data outside message framing.
21. As a browser app developer, I want `stream.write`, `stream.finish`, `stream.read(limit)`, and `stream.readToEnd(limit)`, so that I can send, half-close, and read incrementally or all at once.
22. As a browser app developer, I want `stream.close()` to abort the stream, so that I can tear down a transfer early without waiting for the peer.
23. As a browser app developer, I want `endpoint.close()` to be idempotent and every method called after close to throw a typed `ClosedError`, so that teardown races in my UI cannot produce opaque WASM errors.
24. As a browser app developer, I want a failed WASM load to be retryable, so that a transient network failure fetching the WASM module does not permanently break the page.
25. As a browser app developer, I want typed errors with a `kind` I can switch on (`not-connected`, `not-allowed`, `payload-too-large`, `closed`), so that I can retry or prompt accordingly.
26. As a browser app developer, I want the SDK docs to explain that broadcast is a hop-limited flood with dedup, direct messages require an allowlisted destination, and self-sent messages are delivered locally, so that my app's expectations match actual delivery behavior.
27. As a maintainer, I want the SDK source split into small modules with a thin entry point, so that the WASM bindings, types, stream, and endpoint logic are easy to navigate.
28. As a maintainer, I want the WASM-facing type named after the domain (`MeshEndpoint`, not `WebServer`), so that the code uses the glossary terms endpoint, peer, and mesh consistently.

## Implementation Decisions

- API split: `Endpoint` = identity + lifecycle + peer allowlist; `Mesh` handle (from the endpoint) = `broadcast`, `send`, `onMessage`, `openStream`. Pairing stays on `Endpoint` because pairing decides who enters the allowlist.
- WASM binding rename: `WebServer` becomes `MeshEndpoint` in the wasm crate; TypeScript internal interface names follow.
- Ready-safety: sync registrations (`onMessage`, `onPairingOffer`, `addPeer`, `removePeer`, `peers` read, `pairingEnabled` set) are buffered in the TS wrapper and flushed when `ready` resolves. Async methods keep awaiting `ready`.
- Lifecycle: wrapper tracks `closed`; `close()` is idempotent; all public methods throw `ClosedError` after close; local listener lists are cleared on close; the internal `ready` promise gets a no-op catch so failed init is not an unhandled rejection but still rejects for awaiters.
- WASM loading: the cached module promise is reset on failure so the next construction retries the import.
- Errors: the wasm crate returns error kinds (not just message strings); TS maps them to a single `MeshError` class with a `kind` field. Kinds include `not-connected`, `not-allowed`, `payload-too-large`, `closed`, `unknown-offer`.
- Observability: expose the core's allowlist change watch as `onPeersChanged`; expose the pairing acceptance watch as `onPairingAcceptance`; expose timed pairing as `pairingEnabledFor(ms)` using the core's duration-based enable.
- Pairing offers: the TS wrapper records `answered` on first `reply()` and rejects later replies with a typed error before crossing WASM.
- Streams: add `close()` (drop/abort the connection) and incremental `read(limit)` backed by the receive stream; keep `write`, `finish`, `readToEnd`.
- API contracts (unchanged shapes): `EndpointId` stays a branded string; `Message` = source + destination (null for broadcast) + payload bytes; `PairingOffer` = remote + payload + `reply` + `answered`; listeners return an `Unsubscribe` function.
- Module split: sibling modules for wasm bindings, public types, `Stream`, and `Endpoint`/`Mesh`; the entry module only re-exports.
- Docs: JSDoc and README state broadcast/direct delivery semantics, the allowlist requirement for `send`, inventory-vs-connection meaning of `peers`, and lifecycle error behavior.

## Testing Decisions

- Good test = external behavior only: drive the public SDK API (`Endpoint`, `Mesh`, `Stream`, pairing) and assert observable outcomes (messages received, errors thrown with the right `kind`, events fired, close idempotency). No assertions on WASM internals or handle numbers.
- Seams (one primary, existing seams preferred):
  - Primary seam: the public TS API of `@ofsdk/net` in the browser against the real WASM build — two `Endpoint` instances in the example app over real relays, plus type-level `tsc --noEmit` (`pnpm check`) and biome lint for the package. Pre-`ready` buffering, `ClosedError`, `answered`, and load-retry are all testable at this seam.
  - Rust-side seam (only for binding changes: rename, error kinds, new exposures): the wasm crate's existing headless-Chrome browser tests (`just test-wasm`) plus core crate unit tests (`cargo test --workspace --all-targets`).
- Prior art: core crate unit tests for mesh framing/round-trip and allowlist change notifications; the wasm crate's `tests/browser.rs`; the Svelte example app as an end-to-end two-endpoint demo.
- The example app gets small additions to exercise new behavior (pre-`ready` listener, close-then-use error, timed pairing window) rather than a new test harness.

## Out of Scope

- Changes to the mesh protocol itself (hop limit, dedup, forwarding, ALPNs).
- Relay/preset configuration beyond the existing `secretKey` / `relayUrls` options.
- Live connection-state observation (which peers are currently connected) — `peers` remains documented as allowlist inventory; only change events are added.
- Native (non-browser) Rust API changes beyond what the WASM bindings need to expose.
- Redesigning the example app UI.
- Any new messaging features beyond broadcast/direct/streams/pairing.

## Further Notes

- Implemented as tickets `issues/01`–`issues/10` in this directory; suggested order: 02 (ready race) and 03 (close guard) first as they fix live bugs, then 01 (layering), then the rest.
- Vocabulary follows `GLOSSARY.md`: Endpoint, Peer, Mesh, Broadcast, Direct Message, Byte Stream.
- What stays as-is: branded `EndpointId`, the `Unsubscribe` listener pattern, awaiting `ready` in async methods, payload copying at the WASM boundary.
