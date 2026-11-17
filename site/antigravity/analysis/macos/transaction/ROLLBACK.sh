#!/bin/sh
set -eu

target=${1:?usage: ROLLBACK.sh TARGET_COPY}

case "$target" in
  /*|[A-Za-z]:/*) ;;
  *) target=$(pwd)/$target ;;
esac

# v2 baseline is the exact, nonempty first-round macOS report.
# Keep this script beside BASELINE_FILE.md. It needs only a POSIX shell and cp.
script_dir=$(CDPATH= cd -P "$(dirname "$0")" && pwd)
cp "$script_dir/BASELINE_FILE.md" "$target"
