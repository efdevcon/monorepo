# NocoDB Dynamic Forms

## Routes

| Route | Description |
|-------|-------------|
| `/form/{slug}` | Named form (requires entry in config) |
| `/form/d/{viewId}` | Any NocoDB form view by ID |

Both routes render the same `FormPage` component. OTP is enforced if the viewId has `requireOtp: true` in config — checked by both routes.

## Config

`src/config/nocodb-forms.ts` — only needed for slug aliases and OTP:

```ts
'student-application': {
  formViewId: 'vwgfemz67zunzvyo',
  requireOtp: true,
}
```

## How it works

1. Page fetches `/api/nocodb/{viewId}/schema/` to get form title + fields
2. Schema API queries NocoDB's PostgreSQL meta DB (`nocodb-meta.ts`) to resolve viewId → base/table/fields
3. Form fields (order, visibility, labels, required) come from `nc_form_view_columns_v2`
4. Submissions go to `/api/nocodb/{viewId}/submit/` which uses the NocoDB SDK for row CRUD

## Key files

- `src/services/nocodb-meta.ts` — PostgreSQL queries against NocoDB meta DB
- `src/services/nocodb.ts` — NocoDB SDK wrapper (CRUD operations)
- `src/config/nocodb-forms.ts` — slug → viewId mapping + flags
- `src/components/domain/nocodb-form/FormPage.tsx` — shared form UI
- `src/components/domain/nocodb-form/OtpGate.tsx` — email verification gate
- `src/components/domain/nocodb-form/FormRenderer.tsx` — field rendering
- `src/pages/api/nocodb/[viewId]/` — schema, submit, submission APIs

## Adding a new form

**With a slug:** Add an entry to `nocodbForms` in `src/config/nocodb-forms.ts`.

**Without a slug:** Just use `/form/d/{viewId}` directly — no config needed.

## Environment

- `NOCODB_META_DB_URL` — PostgreSQL connection to NocoDB meta database
- `NOCODB_BASE_URL` — NocoDB API base URL (for row CRUD)
- `NOCODB_API_TOKEN` — NocoDB API token
