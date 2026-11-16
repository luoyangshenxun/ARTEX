# Antigravity IDE — overview analysis

Date: 2026-11-16
Subject: `Antigravity-IDE-2.7.0-windows-x64.exe` (SHA-256 `307c7a41…e00c822`)

## 1. What the application is

Google **Antigravity** is an "agent-first" AI development platform. The product
line published at `antigravity.google/download` ships several components:

- **Antigravity IDE** — a standalone editor, a **fork of VS Code** (Electron +
  Chromium + Node). This is the `.exe` downloaded here.
- **Antigravity Hub / desktop client** — a separate app (`storage.googleapis.com/antigravity-public/antigravity-hub/…`).
- **IDE extensions** for VS Code / JetBrains, a **CLI**, and a **Python SDK**.

The IDE's differentiator over stock VS Code is a built-in **agent manager**: agents
plan and execute multi-step coding tasks across the editor, a terminal, and a
browser, backed by Google's **Gemini** models. Sign-in is via Google account.

## 2. Packaging (static findings)

Confirmed by scanning the installer bytes (no execution):

| Observation | Evidence |
| --- | --- |
| Installer framework | `Inno Setup Setup Data` / `Inno Setup Messages` markers |
| Vendor | `Google LLC` in the version resource |
| Product name | UTF-16 string `Antigravity IDE` |
| PE type | `PE32 executable (GUI) Intel 80386, MS Windows, 11 sections` |
| Inno script keys | `AppId`, `AppName`, `AppPublisher`, `AppCopyright`, `DefaultDirName`, `DefaultGroupName`, `PublisherURL`, `AppSupportURL` (payload compressed) |

Inno Setup is the **same installer technology Microsoft uses for VS Code**, which
is consistent with Antigravity being a VS Code distribution. A typical install
lays down an Electron app tree:

```
<AppDir>/
├── Antigravity.exe            # Electron shell (renamed electron.exe)
├── resources/app/             # or app.asar — the forked VS Code product
│   ├── product.json           # branding, update URL, built-in extension list
│   └── out/                   # compiled main + renderer JS
├── resources/app/extensions/  # bundled extensions (incl. the Antigravity agent)
└── *.dll                      # Chromium / Electron runtime
```

## 3. Architecture (expected, from the VS Code-fork model)

- **Main process** (Electron/Node): window + lifecycle, file system, process
  spawning, auto-update.
- **Renderer** (Chromium): the Monaco-based editor UI plus the agent/chat panels.
- **Extension host** (Node child process): runs the bundled Antigravity agent
  extension, which is the client to Google's backend.
- **Backend calls**: agent/model traffic goes to Google services over HTTPS
  (Gemini + Antigravity APIs), authenticated with the signed-in Google account.
- **Updates**: `product.json` points at a Google update feed; the `2.7.0-4507555968450560`
  build id matches the stable release channel.

## 4. Suggested next steps (if deeper, authorized analysis is wanted)

Non-destructive, reversible inspection only — pick based on the actual goal:

1. **Unpack the installer** with `innoextract` to get the real file tree without
   running it.
2. **Read `product.json`** — reveals update endpoints, telemetry config, built-in
   extension ids, and branding. Cheapest high-signal artifact.
3. **Inspect `app.asar`** (`npx asar extract`) to read the forked VS Code sources
   and the agent extension's JS.
4. **Observe network** of a running instance (mitmproxy / the project's own
   `traffic/` recorder) to map the API surface to Google's backend.

> These are read-only/observational. This workspace intentionally does **not**
> carry protection-defeat, DRM, licensing, anti-hook, or multi-account automation
> tooling. State the authorized objective before any of that is considered.
