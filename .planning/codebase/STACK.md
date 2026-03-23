# Technology Stack

**Analysis Date:** 2026-03-23

## Languages

**Primary:**
- Rust (stable) - Core system: kernel, runtime, API server, CLI, extensions
- TypeScript 5.6 - WebUI frontend

**Secondary:**
- TOML - Configuration files, workspace manifests
- Shell (Dockerfile, scripts) - Deployment and build automation

## Runtime

**Rust:**
- Toolchain: stable (configured in `rust-toolchain.toml`)
- Minimum MSRV: 1.75
- Edition: 2021
- Async runtime: Tokio 1.x with full features

**Node.js:**
- Used in Docker image for Tauri desktop builds and MCP server execution (npx-based)
- pnpm used as package manager for webui

## Package Managers

**Rust:**
- Cargo (workspace-based monorepo with 14 crates)
- Lockfile: `Cargo.lock` (committed)

**Frontend:**
- pnpm
- Lockfile: `pnpm-lock.yaml` (committed)
- Config: `crates/openfang-webui/package.json`

## Crates (Rust Workspace)

| Crate | Purpose |
|-------|---------|
| `openfang-types` | Shared types, enums, model catalog constants |
| `openfang-memory` | SQLite-backed episodic/semantic memory |
| `openfang-runtime` | Agent execution loop, LLM drivers, tool runner, WASM sandbox |
| `openfang-wire` | Wire protocol, serialization (MessagePack) |
| `openfang-api` | HTTP/WebSocket API server (Axum-based daemon) |
| `openfang-kernel` | Core kernel: config loading, agent registry, scheduling |
| `openfang-cli` | CLI binary entry point with interactive TUI (ratatui) |
| `openfang-channels` | Messaging integrations: Telegram, Discord, Slack, email (SMTP/IMAP) |
| `openfang-migrate` | Database migrations |
| `openfang-skills` | Skill registry and execution |
| `openfang-desktop` | Tauri 2.0 native desktop application |
| `openfang-webui` | React 19 frontend (Vite dev server, embedded in desktop) |
| `openfang-hands` | Bundled SOPs (Standard Operating Procedures) registry |
| `openfang-extensions` | MCP server integration system, credential vault, OAuth2 PKCE |
| `xtask` | Build automation tasks |

## WebUI (React Frontend)

**Framework:** React 19
**Build:** Vite 6
**Language:** TypeScript 5.6 (strict mode)
**Styling:** Tailwind CSS v4 (CSS-first config via `@tailwindcss/vite`)
**UI Components:** shadcn/ui (Radix UI primitives)
**State Management:** Zustand v5 (client state), TanStack Query v5 (server state)
**Routing:** React Router v7
**Animation:** Framer Motion, GSAP
**Charts:** Recharts
**Node Editor:** @xyflow/react (React Flow)
**Icons:** Lucide React
**i18n:** i18next with react-i18next (EN, ZH-CN, ZH-TW, JA)
**HTTP Client:** Axios
**Desktop Bridge:** @tauri-apps/api v2, @tauri-apps/plugin-shell

**Dev tooling:**
- ESLint 9 with react-hooks and react-refresh plugins
- TypeScript strict mode (noUnusedParameters enforced, noUnusedLocals opt-out)

## Rust Frameworks & Libraries

**HTTP Server (API daemon):**
- Axum 0.8 with WebSocket support
- Tower 0.5 + Tower-HTTP 0.6 (CORS, tracing, gzip/br compression)

**Serialization:**
- serde + serde_json for JSON
- toml 0.8 for config
- rmp-serde for MessagePack (wire protocol)
- serde_yaml for YAML parsing
- json5 for relaxed JSON

**Database:**
- rusqlite 0.31 (bundled SQLite with JSON extension) - all persistent storage

**Async & Concurrency:**
- Tokio 1.x with full features
- tokio-stream, tokio-tungstenite (WebSocket client)
- futures 0.3
- async-trait 0.1
- dashmap 6 (concurrent hash map)
- crossbeam 0.8

**Error Handling:**
- thiserror 2 (structered errors)
- anyhow 1 (context errors)

**Logging & Tracing:**
- tracing 0.1
- tracing-subscriber 0.3 (env-filter + JSON formatting)

**LLM HTTP Client:**
- reqwest 0.12 (rustls-tls, streaming, gzip/deflate/br decompression)

**CLI/TUI:**
- clap 4 with derive macros for CLI argument parsing
- clap_complete 4 for shell completions
- ratatui 0.29 for TUI rendering
- colored 3 for terminal colors

**WebAssembly:**
- wasmtime 41 for sandboxed tool execution

**Email:**
- lettre 0.11 (SMTP with tokio runtime and rustls TLS)
- imap 2 (IMAP client)
- mailparse 0.16 (MIME parsing)
- native-tls 0.2

**Security:**
- sha2, sha1 for hashing
- aes-gcm 0.10 for encryption
- argon2 0.5 for password hashing
- ed25519-dalek 2 for signatures
- subtle 2 for constant-time operations
- zeroize 1 for secure memory wiping

**Rate Limiting:**
- governor 0.8

**Misc:**
- uuid 1 (v4/v5 + serde)
- chrono 0.4 + chrono-tz 0.10
- dirs 6 for home directory resolution
- walkdir 2 for directory traversal
- zip 2 for archive extraction
- socket2 0.5 for low-level socket options
- html-escape 0.2 for HTML entity decoding
- regex-lite 0.1 for lightweight regex

## Desktop

**Framework:** Tauri 2.0
**Rust backend:** Axum embedded HTTP server
**Plugins:** notification, shell, single-instance, dialog, global-shortcut, autostart, updater

## Build Profiles

**Release:** LTO=true, codegen-units=1, strip=true, opt-level=3
**Release-fast:** LTO=thin, codegen-units=8, opt-level=2, no strip

## Configuration

**Daemon config:** `~/.openfang/config.toml` (TOML)
**Example config:** `openfang.toml.example`
**OpenFang home:** `$OPENFANG_HOME` env var, defaults to `~/.openfang`
**API server:** default `127.0.0.1:4200`
**OFP network:** default `127.0.0.1:4200`

## Platform Support

**Primary development:** macOS (darwin)
**Docker:** Multi-stage build targeting `rust:1-slim-bookworm`
**Cross-compilation:** `Cross.toml` (cross crate) for cross-compilation
**Nix:** `flake.nix` for Nix/NixOS environments
**Unix-specific:** libc 0.2 for platform features

---

*Stack analysis: 2026-03-23*
