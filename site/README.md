# Local analysis workspaces

- `antigravity/`: installer provenance, static-analysis scripts, fingerprint reports,
  focused source evidence, and offline verification records.
- `claude/`: Claude Code npm-package provenance, static request-fingerprint tables,
  field-domain rules, beta matrices, auth/body analysis, and verification scripts.
- `evplayer2/`: analysis reports, inspection scripts, and hook verification artifacts.

Git tracks source files and reviewable analysis results. Downloaded executables,
unpacked application trees, tool binaries, installed dependencies, account captures,
media exports, and runtime media records remain local through the workspace
`.gitignore` files.

## Reproducing the Antigravity analysis

1. Obtain the exact installer named in `antigravity/installer/SHA256SUMS.txt` and
   verify its SHA-256 before using it.
2. Extract it statically with InnoUnpacker to
   `antigravity/analysis/unpacked/`, preserving the `{code_GetDestDir}/resources/app/`
   directory structure.
3. From the repository root, run:

   ```sh
   node site/antigravity/analysis/run-analysis.mjs
   ```

The analysis scripts use Node.js and the dependencies bundled in the extracted
application. They regenerate the bulk scans and verification output. The offline
header reproduction intercepts the HTTP adapter and uses synthetic `TOKEN` and
`PROJECT` values.

The checked-in verification records describe the original analysis machine and
sample. Paths, timestamps, hashes of generated reports, and the host Node version
can change when the analysis is rerun elsewhere.

## Preparing the Claude Code analysis

The Claude workspace is scaffolded at `site/claude/`. Place the locally obtained
and hash-recorded `@anthropic-ai/claude-code` and `@anthropic-ai/sdk` package trees
under `site/claude/analysis/unpacked/npm/claude-code/` and
`site/claude/analysis/unpacked/npm/sdk/`, then run:

```sh
node site/claude/analysis/scan-static.mjs
node site/claude/analysis/verify-scaffold.mjs
```

The scan is read-only and records source hashes, byte offsets, line numbers, and
small context windows. It exits with a missing-input status until both package
trees are present.
