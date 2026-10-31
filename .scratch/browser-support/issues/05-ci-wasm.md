# 05: CI pipeline and just recipes for WASM build/test

**What to build:** The WASM target is built and tested in CI so browser support doesn't regress.

**Blocked by:** 04

**Status:** ready-for-agent

- [ ] GitHub Actions job: install `wasm32-unknown-unknown` target, run `just build-wasm` and `just test-wasm`
- [ ] `just build-wasm` recipe verified
- [ ] `just test-wasm` recipe verified
- [ ] Native CI (`cargo hack test --feature-powerset --all-targets`) still green
