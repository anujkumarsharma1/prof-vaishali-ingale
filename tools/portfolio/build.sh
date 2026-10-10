#!/usr/bin/env bash
# Local production-style build (baseurl /prof-vaishali-ingale from _config.yml).
# Works around the container's US-ASCII locale and the Bundler 4.0.6/4.0.18 shim mismatch.
# DEST=/some/dir builds there instead of _site/ (parallel agents each use their own DEST).
set -euo pipefail
cd "$(dirname "$0")/../.."
export LANG=C.UTF-8 LC_ALL=C.UTF-8
JEKYLL="$(bundle exec ruby -e 'print Gem.bin_path("jekyll","jekyll")')"
ARGS=()
if [ -n "${DEST:-}" ]; then ARGS+=(--destination "$DEST" --disable-disk-cache); fi
bundle exec ruby "$JEKYLL" build "${ARGS[@]}" "$@" 2>&1 | grep -vE '^\s+from |AlImgTools: Successfully copied|DEPRECATION WARNING' | tail -20
test -f "${DEST:-_site}/about/index.html"
