#!/bin/sh
set -eu
npx tsx scripts/seed.ts
exec npm start
