#!/bin/sh
set -eu
[ "$#" -eq 1 ] || { printf '%s\n' 'usage: ROLLBACK.sh TARGET_COPY' >&2; exit 2; }
role_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
case "$1" in
  "$role_dir/hook_checks.pristine.js") printf '%s\n' 'Refusing to overwrite baseline' >&2; exit 2 ;;
esac
cp -- "$role_dir/hook_checks.pristine.js" "$1"
