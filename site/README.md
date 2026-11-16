# Local analysis workspaces

- `antigravity/`: installer provenance, static-analysis scripts, fingerprint reports,
  focused source evidence, and offline verification records.
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
