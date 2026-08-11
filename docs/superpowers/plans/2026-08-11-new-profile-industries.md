# New Profile + VSIC Industry Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or implement inline task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Blank “Thêm hồ sơ” flow plus offline VSIC cấp-4 search panel with TT 40 tax notes on GUI.

**Architecture:** Seed `data/industries/` from QĐ 36/2025 level-4 list + TT 40 tax-group map; `src/lib/industries.js` + `/api/industries`; GUI modal create customer + industry combobox panel. PDF unchanged (name + code only).

**Tech Stack:** Node, Express, existing GUI (`public/app.js`), `node:test`.

## Global Constraints

- Node only; no PostgreSQL; offline at render time
- HKD primary industry = VSIC **cấp 4** (NĐ 168)
- Tax notes GUI-only (TT 40/2021); never invent unmapped rates
- `chuThe` canonical; slug via `slug.js`
- Escape text in template; industry rows as today

**Spec:** `docs/superpowers/specs/2026-08-11-new-profile-industries-design.md`

---

### Task 1: Industry lib + fixtures + tax map

**Files:** Create `src/lib/industries.js`, `data/industries/*`, `test/industries.test.js`; touch `paths.js`

- [x] Failing tests for search/get/resolveTax
- [x] Implement + seed `vsic-level4.json` (full cấp 4) + `tax-groups.json`
- [ ] Commit

### Task 2: createCustomer + POST /api/customers

**Files:** `customers.js`, `server.js`, test

- [x] Blank info from FIELDS; reject duplicate/bad slug
- [ ] Commit

### Task 3: GET /api/industries

**Files:** `server.js`

- [x] `?q=&limit=` and `/:code`
- [ ] Commit

### Task 4: GUI — Thêm hồ sơ + industry panel

**Files:** `public/app.js`, `public/style.css`

- [x] Modal create; industry editor with search table + tax note + primary
- [ ] Commit

### Task 5: Docs + verify

- [x] `kb/industries.md`, INDEX, AGENTS; `npm test`; smoke create + search
- [ ] Commit
