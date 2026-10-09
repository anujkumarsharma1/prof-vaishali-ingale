#!/usr/bin/env bash
# Re-creates room/assets/models and room/assets/textures from the CC0 sources listed in room/CREDITS.md.
# Needs Node 18+, Python 3 with Pillow, curl and unzip. Usage: tools/optimize_models.sh [path/to/room]
set -euo pipefail
ROOM="$(cd "${1:-$(dirname "$0")/..}" && pwd)"
WORK="${WORK:-/workspace/p3d}"
RAW="$WORK/raw"; TOOLS="$WORK/tools"
mkdir -p "$RAW" "$TOOLS" "$ROOM/assets/models" "$ROOM/assets/textures"

fetch_ph() {  # Poly Haven glTF 1k with its textures
  local a="$1"
  [ -f "$RAW/$a/${a}_1k.gltf" ] && return
  curl -sfL "https://api.polyhaven.com/files/$a" -o "$RAW/$a.files.json"
  python3 - "$RAW" "$a" <<'PY'
import json, os, sys, urllib.request
raw, a = sys.argv[1:]
g = json.load(open(f'{raw}/{a}.files.json'))['gltf']['1k']['gltf']
os.makedirs(f'{raw}/{a}', exist_ok=True)
urllib.request.urlretrieve(g['url'], f'{raw}/{a}/{a}_1k.gltf')
for rel, inc in g.get('include', {}).items():
    p = os.path.join(raw, a, rel); os.makedirs(os.path.dirname(p), exist_ok=True)
    urllib.request.urlretrieve(inc['url'], p)
PY
}
for a in standing_chalkboard_01 potted_plant_04 wall_clock desk_lamp_arm_01; do fetch_ph "$a"; done
[ -d "$RAW/kenney" ] || { curl -sfL -o "$RAW/kenney.zip" "https://kenney.nl/media/pages/assets/furniture-kit/440e0608a4-1677580847/kenney_furniture-kit.zip"; unzip -qo "$RAW/kenney.zip" -d "$RAW/kenney"; }
[ -d "$RAW/wood" ] || { curl -sfL -o "$RAW/wood.zip" "https://ambientcg.com/get?file=WoodFloor051_1K-JPG.zip"; unzip -qo "$RAW/wood.zip" -d "$RAW/wood"; }

if [ ! -d "$TOOLS/node_modules/@gltf-transform/functions" ]; then
  (cd "$TOOLS" && npm init -y >/dev/null && npm i @gltf-transform/cli@4 three@0.170.0 >/dev/null)
fi
cp "$(dirname "$0")/optimize.mjs" "$(dirname "$0")/floor.py" "$TOOLS/" 2>/dev/null || true
(cd "$TOOLS" && node optimize.mjs "$RAW" "$ROOM/assets/models")
python3 "$TOOLS/floor.py" "$RAW/wood" "$ROOM/assets/textures"
du -b "$ROOM"/assets/models/* "$ROOM"/assets/textures/*
