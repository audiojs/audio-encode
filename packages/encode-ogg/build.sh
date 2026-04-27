#!/bin/bash
set -e
cd "$(dirname "$0")"
npx esbuild src/ogg-encode.src.js --bundle --format=esm --outfile=ogg-encode.js --platform=browser
