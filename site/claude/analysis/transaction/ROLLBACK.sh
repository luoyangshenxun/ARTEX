#!/bin/sh
set -eu

target=${1:?usage: ROLLBACK.sh TARGET_COPY}
script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)
baseline="$script_dir/BASELINE.md"
target_dir=$(CDPATH= cd -- "$(dirname -- "$target")" && pwd -P)
target="$target_dir/$(basename -- "$target")"

case "$target" in
  "$script_dir"/*) ;;
  *) echo "target must be inside $script_dir" >&2; exit 2 ;;
esac

if [ "$target" = "$baseline" ] || [ -L "$target" ]; then
  echo "refusing to overwrite baseline or symbolic link" >&2
  exit 2
fi

cp "$baseline" "$target"
echo "RESTORED $target FROM $baseline"
