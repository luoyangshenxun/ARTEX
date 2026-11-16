# EVPlayer2 detection observer

Read ../report_dynamic_hook.md for observed results and limitations.

- hook_checks.js: enabled read-only argument/result observer.
- hook_checks.pristine.js: same observer with HOOKS_ENABLED=false.
- observe.mjs: Node/Frida runner, RPC selftest, window snapshot and unload audit.
- hook_checks.patch: native unified patch from pristine to enabled agent.
- ROLLBACK.sh: executable rollback using its sibling pristine agent.
- verify_transaction.mjs: baseline/modified/rollback verification against PID 56664.
- VERIFICATION.txt: literal outputs, exit statuses, hashes and state transitions.
- transaction_results.json: machine-readable verification summary.
- inspect_entries.mjs / compare_user32.mjs: read-only entry diagnostics.

Runtime dependencies: Node.js and the project-local pinned frida@17.26.0 package.
Run the observer for at most 120 seconds per invocation. Use an existing target PID.
No argument, output-buffer, or return-value replacement is performed by the hooks.
Do not invoke the anomalous SetWindowDisplayAffinity entry recorded in the report.