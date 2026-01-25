#!/bin/bash

# Usage: ./reconcile.sh 2026-01-20 2026-01-21 2026-01-22
echo "Starting manual reconciliation for provided dates..."

# Ensure environment variables are loaded if running outside Docker
# source .env

node ./manual-attendence.js "$@"

echo "Reconciliation sequence finished."