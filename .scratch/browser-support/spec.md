Status: ready-for-agent

# Spec: Browser (WASM) Support for ofnet

## Problem Statement

`ofnet` currently only runs on native targets. Endpoints hosted in web browsers cannot participate in the mesh because the crate depends on `tokio` (full runtime with `net`/`fs`), `std::time::Instant`, and other native-only primitives. Browser-based endpoints need to join the mesh, exchange broadcasts and direct messages, and participate in pairing — all from within a browser's single-threaded WASM sandbox, where only relay-mediated connectivity is available.

## Solution

Add browser support to `ofnet` by extracting the core networking logic into the existing `iroh-chain` crate behind a `web` feature, and creating a **separate** `iroh-chain-wasm` crate that provides a public TypeScript-facing API via `wasm-bindgen`. Browser endpoints connect through user-provided relay servers (no direct UDP hole-punching from browsers), use Pkarr-over-HTTPS for address lookup, and run on `wasm-bindgen-futures` instead of `tokio`.

## User Stories

1. As a browser-based endpoint, I want to join the mesh from a web page, so that I can communicate with other endpoints without installing native software.
2. As a browser-based endpoint, I want to send a broadcast to every endpoint in the mesh, so that all peers receive my message.
3. As a browser-based endpoint, I want to send a direct message to a specific identified endpoint, so that only that peer receives my message.
4. As a browser-based endpoint, I want to receive broadcasts and direct messages from other endpoints, so that I can participate in mesh communication.
5. As a browser-based endpoint, I want to participate in the pairing flow (send and receive pairing offers), so that I can establish trust with new peers.
6. As a TypeScript/JavaScript developer, I want a public TS-facing API for creating a browser endpoint, so that I can integrate mesh networking into a web app without writing Rust.
7. As a TypeScript/JavaScript developer, I want to subscribe to incoming messages via a callback or async iterator, so that my web app reacts to mesh traffic in real time.
8. As a TypeScript/JavaScript developer, I want to configure which relay servers the browser endpoint uses, so that I can point at self-hosted or private relays instead of the default public ones.
9. As a TypeScript/JavaScript developer, I want to provide a secret key (or have one generated) when creating an endpoint, so that my endpoint has a stable identity.
10. As a TypeScript/JavaScript developer, I want to manage the peer allowlist (add/remove/inspect peers), so that I control which endpoints can connect to mine.
11. As a TypeScript/JavaScript developer, I want to enable/disable pairing mode and observe pairing acceptance state, so that I can control when new peers can pair.
12. As a TypeScript/JavaScript developer, I want to open a byte stream to a specific peer, so that I can exchange raw bytes with that endpoint.
13. As a native endpoint, I want browser endpoints to appear as regular peers in my mesh, so that mixed native/browser meshes work transparently.
14. As a developer, I want the native build to remain unchanged when the `web` feature is off, so that existing consumers are unaffected.
15. As a developer, I want browser-specific code isolated in a separate crate, so that the core `iroh-chain` crate stays clean and native-focused.
16. As a developer, I want CI to build and test the WASM target, so that browser support doesn't regress.

## Implementation Decisions

### Crate Layout

- **Core logic stays in `iroh-chain`** behind a `web` feature flag. Target-gated dependencies keep native builds clean.
- **New crate `iroh-chain-wasm`** in `crates/iroh-chain-wasm/` provides the public TypeScript-facing API via `wasm-bindgen`. This crate depends on `iroh-chain` with `features = ["web"]` and compiles only for `wasm32-unknown-unknown`.

### Feature Flags

`iroh-chain` gains a `web` feature:

- Enables `iroh/tls-ring` (crypto provider required for the `presets::N0` preset).
- Pulls in browser-only dependencies: `wasm-bindgen`, `wasm-bindgen-futures`, `js-sys`, `web-time`, `gloo-timers`, `getrandom` with `wasm_js`.
- The existing `utoipa` and `axum` features remain native-only (server-side HTTP concerns, not applicable to browsers).

### Async Runtime Abstraction

A new internal module in `iroh-chain` abstracts the async runtime:

| Concern | Native | Browser |
|---------|--------|---------|
| Spawning tasks | `tokio::spawn` | `wasm_bindgen_futures::spawn_local` |
| Sleeping | `tokio::time::sleep` | `gloo_timers::future::TimeoutFuture` |
| Timeouts | `tokio::time::timeout` | `gloo_timers` / `wasm_bindgen_futures` wrapper |
| Current time | `std::time::Instant` | `web_time::Instant` |
| Async mutex | `tokio::sync::Mutex` | `futures::lock::Mutex` |
| Broadcast channel | `tokio::sync::broadcast` | custom wrapper over `futures::channel` |
| Watch channel | `tokio::sync::watch` | custom wrapper over `futures::channel` |
| `select!` | `tokio::select!` | `futures::select!` |

Sync primitives (`std::sync::Mutex`, `std::sync::RwLock`) are usable in WASM (single-threaded) but must never be held across `.await` points.

### Target-Gated Dependencies in `iroh-chain`

- `tokio` moves to `[target.'cfg(not(all(target_family = "wasm", target_os = "unknown")))'.dependencies]`.
- Browser-only deps go under `[target.'cfg(all(target_family = "wasm", target_os = "unknown")))'.dependencies]`.

### Relay Configuration

Browser endpoints cannot do UDP hole-punching; all traffic routes through relay servers. The `iroh-chain-wasm` crate's public API accepts a list of relay URLs (e.g. `["https://relay.example.com"]`) at construction time, passed to the iroh `Endpoint` builder via `RelayMode::Custom` with a `RelayMap`. The `presets::N0` preset is the fallback when no custom relays are provided.

### iroh Preset Selection

- Native: existing `Preset` parameter to `Server::bind*` is used as-is.
- Browser: `presets::N0` is used by default (it internally skips `DnsAddressLookup` on `wasm_browser` and uses `PkarrResolver` over HTTPS). Custom relays override the relay mode.

### Module-by-Module Changes in `iroh-chain`

- **`store.rs`**: Replace `tokio::sync::watch` with the runtime-abstraction channel. `std::sync::RwLock` stays.
- **`hooks.rs`**: `std::time::Instant` → `web_time::Instant` on wasm via the abstraction. `std::sync::Mutex` stays.
- **`mesh.rs`**: Replace all `tokio::spawn`, `tokio::time::timeout`, `tokio::time::sleep`, `tokio::select!`, and `tokio::sync::*` with runtime-abstraction equivalents.
- **`server.rs`**: Same replacements as mesh. `tokio::sync::broadcast`/`watch` → abstraction.
- **`pairing.rs`**: `tokio::sync::Mutex` → `futures::lock::Mutex` on wasm.

### Public TS API (`iroh-chain-wasm`)

A `wasm-bindgen`-annotated `WebServer` (or similarly named) struct exposing:

- `async fn new(secret_key_hex: Option<String>, relay_urls: Vec<String>) -> Result<WebServer, JsError>` — create endpoint with optional stable identity and custom relays.
- `fn endpoint_id(&self) -> String` — hex-encoded `EndpointId`.
- `async fn broadcast(&self, payload: Uint8Array) -> Result<(), JsError>` — send a broadcast.
- `async fn send(&self, destination_id: String, payload: Uint8Array) -> Result<(), JsError>` — send a direct message.
- `fn subscribe_messages(&self, callback: js_sys::Function) -> u32` — register a JS callback for incoming messages; returns a subscription handle.
- `fn unsubscribe_messages(&self, handle: u32)` — remove a message callback.
- `fn peers(&self) -> Vec<String>` — list allowlisted peer IDs.
- `fn add_peer(&self, id: String)`, `fn remove_peer(&self, id: String)` — manage allowlist.
- `fn set_pairing_enabled(&self, enabled: bool)` — toggle pairing mode.
- `fn subscribe_pairing_offers(&self, callback: js_sys::Function) -> u32` — register callback for pairing offers.
- `async fn reply_to_pairing_offer(&self, offer_id: String, payload: Uint8Array) -> Result<(), JsError>` — respond to a pairing offer.
- `async fn open_stream(&self, peer_id: String) -> Result<WebStream, JsError>` — open a byte stream.
- `async fn close(&self)` — shut down the endpoint.

### Testing Seams

The highest existing seam is the **`Server` public API** — all mesh, pairing, and message behavior is exercised through `Server` methods and `broadcast::Receiver<Message>` subscriptions. Tests should target this seam:

- Existing integration tests in `tests/mesh.rs` already exercise `Server` end-to-end (broadcast, direct messages, pairing, streams). These are the prior art.
- Browser tests use `wasm-bindgen-test` running headless in Chrome via `wasm-pack test --headless --chrome`.
- A mixed native/browser test: one `Server` on native, one via the WASM test harness, verifying they can exchange messages through a shared relay.

### Build & CI

- Add `wasm32-unknown-unknown` target to CI.
- `just` recipes: `build-wasm` (`cargo build -p iroh-chain-wasm --target wasm32-unknown-unknown`) and `test-wasm` (`wasm-pack test --headless --chrome`).
- Release profile already has `opt-level = "s"`, `lto = "thin"`, `codegen-units = 1` — suitable for WASM bundle size.

## Testing Decisions

- **Test external behavior only**: tests should assert on messages received, pairing outcomes, and connection state — not on internal mutex types or spawn mechanisms.
- **Primary seam**: `Server` public API (`broadcast`, `send`, `subscribe_messages`, `subscribe_pairing_offers`, `connect_direct`, `open_stream`).
- **Prior art**: `tests/mesh.rs` integration tests — they spin up multiple `Server` instances, exchange messages, and assert delivery. Browser tests mirror these patterns using `wasm-bindgen-test`.
- **Native regression**: `cargo hack test --feature-powerset --all-targets` must continue to pass with `web` off.
- **WASM tests**: `wasm-bindgen-test` in headless Chrome; test at minimum: endpoint creation, broadcast round-trip between two WASM endpoints, direct message, pairing offer/reply.
- **Mixed test** (if feasible in CI): one native `Server` + one WASM `Server` connected via a test relay, verifying cross-runtime mesh communication.

## Out of Scope

- Server-side HTTP APIs (`axum`, `utoipa`) — these remain native-only and are not exposed to browsers.
- Direct UDP connections from browsers — impossible in the WASM sandbox; all browser traffic is relay-mediated.
- DNS-based address lookup in browsers — iroh handles this internally via Pkarr-over-HTTPS.
- Multi-threading / `tokio::rt-multi-thread` in browsers — WASM is single-threaded.
- Node.js (non-browser) WASM support — target is `wasm32-unknown-unknown` in browsers only.

## Further Notes

- iroh 1.x already compiles for `wasm32-unknown-unknown`; the `wasm_browser` cfg alias is `all(target_family = "wasm", target_os = "unknown")`.
- The `presets::N0` preset automatically skips `DnsAddressLookup` on `wasm_browser` and uses `PkarrResolver::n0_dns()` (HTTPS-based) instead.
- `getrandom` requires the `wasm_js` feature on WASM for `SecretKey::generate()`.
- `web-time` provides a drop-in `Instant` replacement that uses `Performance.now()` in browsers.
- Bundle size is a concern: iroh + rustls is large. The release profile's `opt-level = "s"` + thin LTO helps; further size reduction (e.g. `wee_alloc`, removing unused features) can be explored later.
