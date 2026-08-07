#!/usr/bin/env bash
set -euo pipefail

# Resolve the Dark Editor data file without relying on the caller's cwd.
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATA_DIR="${DARK_EDITOR_DATA_DIR:-$REPO_ROOT/web/dark_editor/data}"
DATA_FILE="$DATA_DIR/projects.json"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_FILE="$DATA_FILE.$STAMP.bak"
QUARANTINE_FILE="$DATA_FILE.$STAMP.quarantine.json"

if [[ ! -f "$DATA_FILE" ]]; then
  echo "No project data file found: $DATA_FILE" >&2
  exit 1
fi

mkdir -p "$DATA_DIR"
cp --preserve=mode,timestamps "$DATA_FILE" "$BACKUP_FILE"

DATA_FILE="$DATA_FILE" BACKUP_FILE="$BACKUP_FILE" QUARANTINE_FILE="$QUARANTINE_FILE" node <<'NODE'
const fs = require('node:fs');

const dataFile = process.env.DATA_FILE;
const backupFile = process.env.BACKUP_FILE;
const quarantineFile = process.env.QUARANTINE_FILE;
const records = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
if (!Array.isArray(records)) throw new Error('projects.json must contain an array');

// These fingerprints match only the two local synthetic records previously
// found in the tracked seed. IDs alone are not sufficient: a real project
// with a reused ID must never be quarantined by this utility.
function isKnownDemo(project) {
  if (!project || project.velox_project_id || project.instaedit_project_id) return false;
  if (project.id === 'id-A' && project.name === 'Updated' && project.type === 'custom') {
    return project.canvas_json && project.canvas_json.bar === 2 && project.folder_id === 'folder-1';
  }
  if (project.id === 'id-B' && project.name === 'B' && project.type === 'banner') {
    return project.canvas_json && project.canvas_json.foo === 1 && project.folder_id === null;
  }
  return false;
}

const quarantined = records.filter(isKnownDemo);
const survivors = records.filter((project) => !isKnownDemo(project));

// Quarantine is reversible: preserve the original backup and the exact
// records removed from the active file. Never issue a destructive DELETE.
fs.writeFileSync(quarantineFile, JSON.stringify({
  source: dataFile,
  backup: backupFile,
  created_at: new Date().toISOString(),
  records: quarantined,
}, null, 2) + '\n');
fs.writeFileSync(dataFile, JSON.stringify(survivors, null, 2) + '\n');

console.log(`Backed up ${dataFile} to ${backupFile}`);
console.log(`Quarantined ${quarantined.length} known demo record(s) to ${quarantineFile}`);
console.log(`Preserved ${survivors.length} project record(s)`);
NODE
