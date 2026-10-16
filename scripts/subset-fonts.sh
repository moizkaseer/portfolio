#!/usr/bin/env bash
# Subsets Vercel's full Geist / Geist Mono variable fonts (node_modules/geist) to Latin + the
# arrows block, so → ↵ ↓ render in Geist on every OS without shipping the whole font.
# Ranges: Google Fonts' "latin" subset + U+2190–21FF (arrows). Requires fontTools (pip install fonttools brotli).
set -euo pipefail
cd "$(dirname "$0")/.."
LATIN="U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2190-21FF,U+2212,U+2215,U+FEFF,U+FFFD"
SRC=node_modules/geist/dist/fonts
for pair in "geist-sans/Geist-Variable:Geist-Variable" "geist-mono/GeistMono-Variable:GeistMono-Variable"; do
  in="$SRC/${pair%%:*}.woff2"; out="app/fonts/${pair##*:}.subset.woff2"
  pyftsubset "$in" --unicodes="$LATIN" --layout-features='*' --flavor=woff2 --output-file="$out"
  echo "$out $(wc -c < "$out") bytes"
done
