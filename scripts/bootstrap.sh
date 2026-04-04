#!/usr/bin/env bash
set -e

echo "Installing dependencies..."
pnpm install

echo "Building shared packages..."
pnpm --filter './packages/*' build

echo "Done. Run 'pnpm dev:api' or 'pnpm dev:web' to start."
