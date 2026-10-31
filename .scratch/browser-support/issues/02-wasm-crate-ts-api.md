# 02: Create `iroh-chain-wasm` crate with `WebServer` TypeScript API

**What to build:** A new workspace crate that wraps `iroh-chain` (with `web` feature) in a `wasm-bindgen` public API, so TypeScript/JavaScript developers can create and use a browser endpoint.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] New crate `crates/iroh-chain-wasm/` added to workspace, compiles only for `wasm32-unknown-unknown`
- [ ] `WebServer::new(secret_key_hex: Option<String>, relay_urls: Vec<String>)` — creates endpoint with optional stable identity and custom relay servers (falls back to default N0 relays)
- [ ] `endpoint_id() -> String` — hex-encoded EndpointId
- [ ] `broadcast(payload: Uint8Array)` — send broadcast to mesh
- [ ] `send(destination_id: String, payload: Uint8Array)` — send direct message
- [ ] `subscribe_messages(callback) -> u32` / `unsubscribe_messages(handle)` — JS callback for incoming messages
- [ ] `close()` — shut down endpoint
- [ ] `just build-wasm` recipe builds the crate
