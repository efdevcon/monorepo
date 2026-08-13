# NocoDB upgrade: 0.301.5 (CE) → 2026.x regression check

*Researched 2026-08-13, against NocoDB `develop` (post-2026.08.0) source and release notes. Instance: `https://form.devcon.org` (workspace/base IDs: see the deep-link in `devcon/src/pages/builder-review/[id].tsx` or any grid URL in the NocoDB UI).*

## Verdict

**Low regression risk in our code; the main risk is the upgrade operation itself (DB migrations).**
Every endpoint our form stack uses, including the legacy v1 ones, is still served in the latest NocoDB source. NocoDB switched from `0.x` to date-based versioning after 0.301.5; latest release at time of research is **2026.08.0** (Aug 5, 2026).

## Where NocoDB is used (full inventory)

Only two packages touch NocoDB: `devcon` and `devcon-api`. Auth is `xc-token` everywhere (no `xc-auth` anywhere). SDK: `nocodb-sdk ^0.301.3`, imported only by `devcon/src/services/nocodb.ts`.

Env vars: `NOCODB_BASE_URL` + `NOCODB_API_TOKEN` (devcon); `NOCODB_URL` + `NOCODB_API_TOKEN` + `NOCODB_WEBHOOK_SECRET` + `NOCODB_TABLES` (devcon-api).

### Table / view IDs (not listed here; find them in code)

IDs are deliberately not reproduced in this doc. Each one is hardcoded at its usage site:

| What | Where the ID lives |
|---|---|
| Builder Application table | `devcon/src/scripts/builder/setup-nocodb.ts` (`TABLE_ID`), also `APPLICATION_SOURCES` in `devcon/src/pages/api/x402/admin/sales-stats.ts` |
| Builder Application form view | `devcon/src/pages/api/builder/review/[id].ts` (`VIEW_ID`) |
| Builder Application grid view + workspace/base | deep-link URL in `devcon/src/pages/builder-review/[id].tsx` |
| Student Application table | `devcon/src/scripts/students/bulk-validate-whitelisted.ts` (`TABLE_ID`), also `APPLICATION_SOURCES` in sales-stats |
| Youth Ticket Application table | `APPLICATION_SOURCES` in sales-stats |
| Form config table (slug → viewId, requireOtp, isOpen) | `devcon/src/services/form-config.ts` (`FORM_CONFIG_TABLE_ID`) |
| FAQ table (devcon-api sync) | devcon-api env var `NOCODB_TABLES` (JSON tableId → name) |
| rtd-event-form (Road to Devcon) form view | `devcon/src/services/rtd-events.ts` |
| Per-form slugs → form view IDs at runtime | rows of the Form config table itself |

### Call sites by API generation

**v1 data API** (`/api/v1/db/data/noco/{baseId}/{tableId}`, via nocodb-sdk):
- `devcon/src/services/nocodb.ts`: `createRow`, `updateRow`, `getRowById`, `findRowByEmail` (uses `where=(col,eq,val)`), `listRows`, `listViewRows`
- Consumers: `api/nocodb/[viewId]/submit.ts` (main form submission), `submission.ts`, `api/builder/review/[id].ts`, `services/rtd-events.ts`

**v1 meta API** (raw fetch):
- `devcon/src/services/nocodb-meta.ts`: `GET /api/v1/db/meta/forms/{viewId}`, `columns/{colId}`, `tables/{tableId}`, `views/{viewId}/columns`, `views/{viewId}/filters` (conditional show/hide rules). Feeds `api/nocodb/[viewId]/schema.ts` and the custom `FormRenderer`.

**v1 storage API**:
- `api/nocodb/[viewId]/upload-attachment.ts` and `upload-proof.ts`: `POST /api/v1/db/storage/upload?path=...`

**Attachment download**:
- `api/nocodb/file.ts`: proxy that only accepts `/dltemp/` (presigned) paths on the NocoDB host, deliberately sends no token
- `services/rtd-event-images.ts`: fetches `att.url` or `signedPath`, mirrors to Supabase Storage
- `devcon/scripts/decrypt.ts`: conditional token when only raw `path` present

**v2 data/meta API** (raw fetch):
- `devcon/src/services/form-config.ts`: `GET /api/v2/tables/{formConfigTableId}/records`
- `devcon/src/pages/api/x402/admin/sales-stats.ts`: v2 records counts across the three application tables
- `devcon/src/scripts/builder/*` (setup-nocodb, configure-form-view, inspect-nocodb, backfill-github): v2 meta with v1 fallback, plus `PATCH /api/v2/meta/forms/...` and `form-columns/...`
- `devcon/src/scripts/students/bulk-validate-whitelisted.ts`: v2 read + v2 bulk PATCH
- `devcon-api/src/clients/nocodb.ts`: v2 records, read-only, paginated

**Internal (undocumented) API**:
- `devcon/src/scripts/nocodb/export-deleted-records.ts`: `/api/v2/internal/{ws}/{base}?operation=recordAuditList` (deleted-record recovery; CE keeps 7 days of audit)

**Webhook FROM NocoDB**:
- `devcon-api/src/controllers/hooks.ts`: `POST /hooks/nocodb(/:tableId)`, auth via `X-Webhook-Secret`, resolves `body.data.table_id` or `body.table_id` or route param, syncs table JSON to `devcon/content/en/external/nocodb/{name}.json` via GitHub commit

## Compatibility check against latest source (verified in `develop`)

| Surface | Status |
|---|---|
| v1 data routes | Still registered (`data-alias.controller.ts`, full CRUD) |
| v1 meta forms/tables/columns/view-columns/view-filters | Still registered, dual-mounted v1 + v2 |
| `POST /api/v1/db/storage/upload` | Still registered (aliased `/api/v2/storage/upload`) |
| `/dltemp/:param` presigned download | Still registered (`attachments.controller.ts`) |
| v2 `tables/:id/records` data API | Fully supported (docs mark v2 "will deprecate soon" in favor of v3; not removed) |
| `recordAuditList` internal op | Still exists (`internal/modules/RecordAuditList.operations.ts`), now behind per-operation ACL scopes (`base` scope); admin token passes |
| Webhook v2 payload | Compatible: v2 and v3 hooks both send `{type, id, data: {table_id, rows...}}`; v1/v2 hooks explicitly kept backward compatible in `webhook-invoker.ts` |
| `nocodb-sdk ^0.301.3` | Fine as-is; it only wraps v1 routes that are still served |

## Real risks

1. **DB migration jump (biggest hazard).** 0.301.5 → 2026.08.0 crosses ~10 releases of automatic Postgres migrations, including a workspace/org restructuring around 2026.04.x with reported "base not found" (after 2026.04.3) and `MigrationLocked` (issue #12848) failures on version jumps. Table/base/workspace IDs are hardcoded in ~15 files, so a botched migration breaks everything at once. **Back up Postgres, restore into a staging container, upgrade that first, smoke test, then upgrade prod.**
2. **Deployment method.** Since 2026.06.1 NocoDB no longer ships pre-built executables. Docker installs unaffected; if form.devcon.org runs from a binary, the install method must change.
3. **v1/v2 on deprecation notice.** No action needed now, but plan a future migration of `services/nocodb.ts` + `nocodb-meta.ts` to API v3 (v3 changes attachment upload flow and link-update semantics).
4. **Minor, non-blocking.** 2026.04.0 deprecated creating new legacy Links fields (existing ones keep working; we create none). 2026.05.0 multi-column form layouts are ignored by our custom `FormRenderer` (cosmetic only). Org-level access lockdown in 2026.04.0 is Enterprise-scoped; still verify admins can create bases post-upgrade.

## Post-upgrade smoke test checklist

Run against staging first, then prod:

- [ ] `GET /api/nocodb/{builderFormViewId}/schema/` returns fields + conditional rules (exercises all v1 meta endpoints; view ID = `VIEW_ID` in `api/builder/review/[id].ts`)
- [ ] Submit a test builder application with a normal attachment and an `[encrypted]` `.age` attachment (v1 data create + v1 storage upload)
- [ ] Re-open the submission logged in (`findRowByEmail`, v1 data list with `where`)
- [ ] Load an attachment via `/api/nocodb/file/` (confirms attachment cells still carry `/dltemp/` `signedPath`)
- [ ] `pnpm sync:nocodb` in devcon-api, then edit an FAQ row and confirm the webhook fires and resolves the table
- [ ] `devcon/src/scripts/builder/inspect-nocodb.ts` (read-only v2 meta + form-config read)
- [ ] Builder review page `/builder-review/[id]` loads and can save a decision
- [ ] Road to Devcon page still renders events (`listViewRows` + attachment image mirror)
- [ ] Admins can still create a base (2026.04.0 org access change)

## Sources

- https://github.com/nocodb/nocodb/releases (2026.08.0 latest at research time)
- https://github.com/nocodb/nocodb/releases/tag/2026.08.0
- https://nocodb.com/docs/changelog/2026.04.0 (org access control, LTAR V2, Links deprecation)
- https://nocodb.com/docs/self-hosting/maintenance/upgrading
- https://github.com/nocodb/nocodb/issues/12848 (MigrationLocked on upgrade)
- Verified controllers in `nocodb/nocodb@develop`: `data-alias.controller.ts`, `attachments.controller.ts`, `forms.controller.ts`, `filters.controller.ts`, `internal.controller.ts` + `internal/operationScopes.ts`, `utils/webhook-invoker.ts`
