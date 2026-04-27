#!/bin/bash
set -e
cd "$(dirname "$0")"
npx esbuild src/mp3-encode.src.js --bundle --format=esm --outfile=mp3-encode.js --platform=browser
