#!/bin/sh
set -eu

target=${1:?usage: ROLLBACK.sh TARGET_COPY}

case "$target" in
  /*|[A-Za-z]:/*) ;;
  *) target=$(pwd)/$target ;;
esac

# The pristine baseline for this report artifact is an absent/empty file.
# Recreate that baseline without touching any sibling artifact.
: > "$target"
