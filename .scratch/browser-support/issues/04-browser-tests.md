# 04: Browser tests with wasm-bindgen-test in headless Chrome

**What to build:** Automated tests proving browser endpoints can create, communicate, and pair — running in a real browser via `wasm-bindgen-test`.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] Test: create two WASM endpoints, exchange a broadcast, assert delivery
- [ ] Test: send a direct message between two WASM endpoints, assert only the destination receives it
- [ ] Test: pairing offer/reply flow between two WASM endpoints
- [ ] Test: peer allowlist add/remove reflected in `peers()`
- [ ] `just test-wasm` runs `wasm-pack test --headless --chrome`
