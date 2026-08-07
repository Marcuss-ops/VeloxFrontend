# Demo data cleanup and rollback

## Scope

This cleanup removes synthetic feed-preview content and the local JSON seed that contained
only the non-production records `id-A` and `id-B`. It does **not** delete, migrate, or rewrite
editor projects stored through the authorized project route.

The Dark Editor receives project context from InstaEdit. It must not present bundled group,
channel, competitor, or feed records as real social data.

## Safety rules

Before changing a deployed or shared data directory:

1. Stop writes to the target environment or use its normal maintenance window.
2. Run the utility from the repository root in dry-run mode first. The default is read-only;
   `--apply` is mandatory for any change. Optionally set the actual runtime data directory:

   ```sh
   ./scripts/quarantine-dark-editor-demo-projects.sh --report ./operator/demo-cleanup-dry-run.json
   # after reviewing the report:
   ./scripts/quarantine-dark-editor-demo-projects.sh --apply --report ./operator/demo-cleanup-applied.json
   # or: DARK_EDITOR_DATA_DIR=/srv/velox/data ./scripts/quarantine-dark-editor-demo-projects.sh --apply
   ```

3. On apply, the utility takes a checksum-backed timestamped `.bak` copy, writes a
   `.quarantine.json` manifest and atomically replaces `projects.json`. A lock prevents
   concurrent cleanup. The current `projects-store.ts` resolves
   its default file as `<process.cwd()>/data/projects.json`; use `DARK_EDITOR_DATA_DIR` only when
   the utility is pointed at an explicitly configured external data directory.
4. Inspect the dry-run/apply report and both artifacts; the report records SHA-256 checksums:

   ```sh
   sha256sum "$DARK_EDITOR_DATA_DIR"/projects.json.* 2>/dev/null || true
   ```

5. Never classify a project as demo by its title alone. The utility requires the exact known
   `id-A`/`id-B` fingerprints, rejects records with bridge fields, and preserves every other
   record. If any record is ambiguous, it is left untouched.

This repository keeps the tracked local seed at `[]`. The utility does not run a database
DELETE and does not touch Velox editor content belonging to an authorized project. It only
operates on the explicitly selected JSON data directory; the Velox SQLite file and remote
production databases require separate, reviewed maintenance procedures.

## Verification

From `VeloxFrontend/web/dark_editor` run:

```sh
npx vitest run __tests__/demoDataCleanup.test.ts __tests__/feedPreviewCapture.test.ts
npx tsc --noEmit
```

The cleanup test verifies that:

- the Feed Preview has no Amish or competitor fixture content;
- the compatibility fixture exports an empty array;
- the local project seed is empty;
- project-by-id authorization remains required; and
- the global project catalog remains retired (`410`, owner `instaedit`).

Also inspect the final source tree before deployment:

```sh
rg -n -i 'amish|mockCompetitors' web/dark_editor \
  --glob '!**/.next/**' --glob '!**/node_modules/**' \
  --glob '!**/__tests__/**'
```

The command should return no application data/UI matches. Test names and this runbook may
mention the cleanup policy, but no runtime source may contain the removed demo content. The
Feed Preview fixture module is intentionally deleted rather than retained as an empty export.

## Rollback

If the cleanup causes an unexpected regression:

1. Restore the exact previous tracked commit with the normal Git revert procedure, or restore
   `projects.json` from the timestamped `.bak` file created next to it.
2. If the utility was run, inspect the `.quarantine.json` manifest and restore only records that
   are confirmed non-demo; never restore synthetic records into a production project catalog.
3. Re-run the ownership and project-integrity tests above.
4. If real project data is missing, stop and restore from the authoritative Velox/InstaEdit
   backup; do not reconstruct it from the old demo seed.

A rollback restores code or a local seed file only. It never changes InstaEdit ownership or
reintroduces autonomous groups/channels into Velox.
