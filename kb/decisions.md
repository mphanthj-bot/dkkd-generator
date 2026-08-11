# Project decisions

## Fact

- **Phase A**: schema unify (`chuThe`), HTML escape, fix gitignore swallowing `server.js`
- **Phase B**: extract `src/lib/*`; thin CLI + shared server
- **Phase 3 (stamp-first)**: Node in-memory stamp → HTML → Puppeteer; JSON signatory (no DB)
- **Phase 4 (admin catalog)**: offline dual snapshot (`data/admin/v1|v2`) + bridge; versioned `location_id`; GUI trụ sở pickers; signatory resolved from HQ `location_id` only. See [admin-catalog.md](admin-catalog.md).
- Project home: `D:\CODE\dkkd-generator` (moved from Downloads)

## Out of scope (until requested)

- PostgreSQL
- Full national signatory roster (beyond sample `v1_01-005.json`)
- DOCX pipeline
- Production audit User_ID

## Open

- Expand signatory JSON coverage per district/ward after stamp-first + catalog bridge prove out
