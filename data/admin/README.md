# Offline admin catalog snapshots

Source: [provinces.open-api.vn](https://provinces.open-api.vn)

| Snapshot | API |
|----------|-----|
| `v1/provinces.json` | `GET /api/v1/p/`, `GET /api/v1/p/{code}?depth=2`, `GET /api/v1/d/{code}?depth=2` |
| `v2/provinces.json` | `GET /api/v2/p/`, `GET /api/v2/p/{code}?depth=2` |
| `bridge/legacy-to-new.json` | `GET /api/v2/w/{code}/to-legacies/` (reverse-indexed) |

Catalog cutover date: **2025-07-01** (registrations before → v1, on/after → v2).

Last dump: **2026-08-11T06:08:49.457Z**

Refresh:

```bash
npm run seed:admin
```
