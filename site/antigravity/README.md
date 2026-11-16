# Antigravity App — analysis workspace

Workspace for analyzing **Google Antigravity IDE** (agentic AI development environment,
a fork of VS Code / Electron, Gemini-powered).

## Layout

```
site/antigravity/
├── installer/
│   ├── Antigravity-IDE-2.7.0-windows-x64.exe   # official Google CDN download (Inno Setup, 191 MB)
│   └── SHA256SUMS.txt                           # recorded checksum
├── analysis/
│   └── report_overview.md                       # architecture + packaging notes
└── README.md
```

## Installer provenance

| Field | Value |
| --- | --- |
| Product | Antigravity IDE |
| Version | 2.7.0 (build `2.7.0-4507555968450560`, stable channel) |
| Platform | Windows x64 |
| Publisher | Google LLC |
| Packaging | Inno Setup |
| Source | `edgedl.me.gvt1.com` (Google edge CDN, from antigravity.google/download) |
| SHA-256 | `307c7a41b050ffe742fd4dd1045050df1464de219271f74b5f6c269e9e00c822` |

Other platform builds available from the same release (not downloaded here):
macOS `darwin-arm`/`darwin-x64` `.dmg`, Linux `linux-arm`/`linux-x64` `.tar.gz`,
Windows `arm64` `.exe`.

## Scope note

This workspace holds a **high-level architecture / packaging analysis** of an
officially downloaded installer. It does not contain protection-bypass, license,
anti-detection, or account-automation tooling — unlike the `evplayer2` sibling
workspace. If deeper work is wanted, say what and for what authorized purpose.
