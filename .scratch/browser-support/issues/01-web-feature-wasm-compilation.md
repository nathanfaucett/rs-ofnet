# 01: Add `web` feature + cfg-gate WASM-incompatible call sites in `iroh-chain`

**What to build:** `iroh-chain` compiles for `wasm32-unknown-unknown` when the `web` feature is enabled, while native builds remain unchanged.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Add `web` feature to `iroh-chain` enabling `iroh/tls-ring` and pulling in browser-only deps (`wasm-bindgen-futures`, `js-sys`, `web-time`, `gloo-timers`, `getrandom` with `wasm_js`) via target-gated dependency sections
- [ ] Move `tokio` to a native-only target-gated dependency
- [ ] Cfg-gate 9 call sites: `tokio::spawn` (3× in mesh/server), `tokio::time::sleep` (1× mesh), `tokio::time::timeout` (3× mesh), `tokio::select!` (1× mesh), `Instant::now()` (2× hooks) — use `wasm_bindgen_futures::spawn_local`, `gloo_timers`, `futures::select!`, `web_time::Instant` on wasm
- [ ] `cargo check -p iroh-chain --target wasm32-unknown-unknown --features web` succeeds
- [ ] `cargo hack test --feature-powerset --all-targets` passes on native with `web` off
