#!/usr/bin/env bash
set -e

echo "Removing node_modules and build artifacts..."
find . -name "node_modules" -type d -prune -exec rm -rf {} +
find . -name "dist" -type d -prune -exec rm -rf {} +
find . -name ".next" -type d -prune -exec rm -rf {} +

echo "Clean complete."
