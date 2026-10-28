#!/usr/bin/env bash
set -e

DB_FILE="data/centensor.db"
OUTPUT_FILE="d1-dump.sql"

if [ ! -f "$DB_FILE" ]; then
  echo "Error: Database file $DB_FILE not found!"
  exit 1
fi

echo "1. Checkpointing SQLite WAL file to ensure all changes are committed..."
sqlite3 "$DB_FILE" "PRAGMA wal_checkpoint(TRUNCATE);"

echo "2. Generating clean SQLite dump for Cloudflare D1 (excluding transaction wrappers)..."
sqlite3 "$DB_FILE" .dump | grep -v -E '^(BEGIN TRANSACTION|COMMIT|PRAGMA synchronous);' > "$OUTPUT_FILE"

echo "Dump successfully created at: $OUTPUT_FILE"
echo ""
echo "Next step: Run the following command to import into Cloudflare D1:"
echo "  npx wrangler d1 execute <YOUR_D1_DATABASE_NAME> --remote --file=./$OUTPUT_FILE"
