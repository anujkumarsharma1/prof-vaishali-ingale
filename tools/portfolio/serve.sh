#!/usr/bin/env bash
# Serve a build at http://127.0.0.1:${PORT:-4000}/prof-vaishali-ingale/ (mirrors GitHub Pages' project path).
# DEST=/some/dir serves that build instead of _site/.
set -euo pipefail
cd "$(dirname "$0")/../.."
SITE="$(realpath "${DEST:-_site}")"
ROOT="${TMPDIR:-/tmp}/pvi-serve-${PORT:-4000}"
mkdir -p "$ROOT"
ln -sfn "$SITE" "$ROOT/prof-vaishali-ingale"
exec python3 -m http.server "${PORT:-4000}" --bind 127.0.0.1 --directory "$ROOT"
