# Antigravity App — analysis workspace

Workspace for static analysis of Google Antigravity products. The Windows
**IDE 2.7.0** sample and the **App/Hub 2.32.x** samples are distinct products.
The Hub includes a native Go language_server on both Windows and macOS.

Current analysis (November 17, 2026):

- [Round-two report](analysis/v2/antigravity-static-analysis-v2.md): Windows Hub,
  macOS version/CL comparison, request construction, OAuth and CLI findings.
- [Machine-readable profiles](analysis/v2/antigravity-hub-profiles.json): Windows
  amd64 and macOS arm64, with explicit conditions and unresolved runtime fields.
- [Subway source-excerpt comparison](analysis/subway-fingerprint-diff.md) and
  [macOS report](analysis/macos/antigravity-macos-fingerprint.md).
- [Evidence and verification guide](analysis/v2/README.md).

## Layout

```
site/antigravity/
├── installer/
│   ├── Antigravity-IDE-2.7.0-windows-x64.exe   # official Google CDN download (Inno Setup, 191 MB)
│   └── SHA256SUMS.txt                           # recorded checksum
├── analysis/
│   ├── report_overview.md                       # first Windows IDE analysis
│   ├── macos/                                  # macOS Hub and transaction records
│   └── v2/                                     # round-two report, profiles, evidence
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

The reports distinguish packaged constants and traced construction branches from
runtime observations. No official client was executed in the second round.
Downloaded packages, extracted binaries and portable tool binaries remain ignored;
client secrets are recorded only as SHA-256 hashes. See each report for its
sample provenance, evidence level and unresolved conditions.
