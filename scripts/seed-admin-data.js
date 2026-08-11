'use strict';

const fs = require('fs');
const path = require('path');
const { ADMIN_DIR } = require('../src/lib/paths');
const { CUTOVER_ISO } = require('../src/lib/adminCatalog');
const { normalizeName } = require('../src/lib/adminBridge');

const BASE = 'https://provinces.open-api.vn';
const DELAY_MS = 75;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url) {
  await sleep(DELAY_MS);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  return res.json();
}

function slimWard(w) {
  return { name: w.name, code: w.code };
}

function slimDistrict(d) {
  return {
    name: d.name,
    code: d.code,
    wards: (d.wards || []).map(slimWard)
  };
}

function slimProvinceV1(p) {
  return {
    name: p.name,
    code: p.code,
    districts: (p.districts || []).map(slimDistrict)
  };
}

function slimProvinceV2(p) {
  return {
    name: p.name,
    code: p.code,
    wards: (p.wards || []).map(slimWard)
  };
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJson(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function pushUnique(arr, item) {
  const key = `${item.code}:${item.province_code}`;
  if (!arr.some((x) => `${x.code}:${x.province_code}` === key)) {
    arr.push(item);
  }
}

async function seedV1() {
  console.log('Fetching v1 provinces list...');
  const provinces = await fetchJson(`${BASE}/api/v1/p/`);
  const out = [];

  for (let i = 0; i < provinces.length; i++) {
    const p = provinces[i];
    console.log(`  v1 province ${i + 1}/${provinces.length}: ${p.name} (${p.code})`);
    const detail = await fetchJson(`${BASE}/api/v1/p/${p.code}?depth=2`);
    const districts = [];

    for (const d of detail.districts || []) {
      const dDetail = await fetchJson(`${BASE}/api/v1/d/${d.code}?depth=2`);
      districts.push(slimDistrict(dDetail));
    }

    out.push({
      name: detail.name,
      code: detail.code,
      districts
    });
  }

  return out.map(slimProvinceV1);
}

async function seedV2() {
  console.log('Fetching v2 provinces list...');
  const provinces = await fetchJson(`${BASE}/api/v2/p/`);
  const out = [];

  for (let i = 0; i < provinces.length; i++) {
    const p = provinces[i];
    console.log(`  v2 province ${i + 1}/${provinces.length}: ${p.name} (${p.code})`);
    const detail = await fetchJson(`${BASE}/api/v2/p/${p.code}?depth=2`);
    out.push(slimProvinceV2(detail));
  }

  return out;
}

async function seedBridge(v2Provinces) {
  const toLegaciesByCode = {};
  const fromLegacyByCode = {};
  const fromLegacyByName = {};

  const wardEntries = [];
  for (const p of v2Provinces) {
    for (const w of p.wards || []) {
      wardEntries.push({ ward: w, provinceCode: p.code });
    }
  }

  console.log(`Fetching bridge mappings for ${wardEntries.length} v2 wards...`);

  for (let i = 0; i < wardEntries.length; i++) {
    const { ward, provinceCode } = wardEntries[i];
    if ((i + 1) % 100 === 0 || i === 0 || i === wardEntries.length - 1) {
      console.log(`  bridge ward ${i + 1}/${wardEntries.length}: ${ward.name} (${ward.code})`);
    }

    const legacies = await fetchJson(`${BASE}/api/v2/w/${ward.code}/to-legacies/`);
    const slimLegacies = (legacies || []).map((l) => ({
      code: l.code,
      name: l.name,
      district_code: l.district_code,
      province_code: l.province_code
    }));

    toLegaciesByCode[String(ward.code)] = slimLegacies;

    const newHit = { code: ward.code, name: ward.name, province_code: provinceCode };

    for (const legacy of slimLegacies) {
      const legacyKey = String(legacy.code);
      if (!fromLegacyByCode[legacyKey]) fromLegacyByCode[legacyKey] = [];
      pushUnique(fromLegacyByCode[legacyKey], newHit);

      const nameKey = normalizeName(legacy.name);
      if (!fromLegacyByName[nameKey]) fromLegacyByName[nameKey] = [];
      pushUnique(fromLegacyByName[nameKey], newHit);
    }
  }

  return { fromLegacyByCode, toLegaciesByCode, fromLegacyByName };
}

function writeReadme(dumpedAt) {
  const readme = `# Offline admin catalog snapshots

Source: [provinces.open-api.vn](https://provinces.open-api.vn)

| Snapshot | API |
|----------|-----|
| \`v1/provinces.json\` | \`GET /api/v1/p/\`, \`GET /api/v1/p/{code}?depth=2\`, \`GET /api/v1/d/{code}?depth=2\` |
| \`v2/provinces.json\` | \`GET /api/v2/p/\`, \`GET /api/v2/p/{code}?depth=2\` |
| \`bridge/legacy-to-new.json\` | \`GET /api/v2/w/{code}/to-legacies/\` (reverse-indexed) |

Catalog cutover date: **${CUTOVER_ISO}** (registrations before → v1, on/after → v2).

Last dump: **${dumpedAt}**

Refresh:

\`\`\`bash
npm run seed:admin
\`\`\`
`;
  fs.writeFileSync(path.join(ADMIN_DIR, 'README.md'), readme, 'utf8');
}

async function main() {
  const dumpedAt = new Date().toISOString();
  console.log(`Seeding admin data → ${ADMIN_DIR}`);
  console.log(`Dump timestamp: ${dumpedAt}`);

  const v1 = await seedV1();
  writeJson(path.join(ADMIN_DIR, 'v1', 'provinces.json'), v1);
  console.log(`Wrote v1: ${v1.length} provinces`);

  const v2 = await seedV2();
  writeJson(path.join(ADMIN_DIR, 'v2', 'provinces.json'), v2);
  console.log(`Wrote v2: ${v2.length} provinces`);

  const bridge = await seedBridge(v2);
  writeJson(path.join(ADMIN_DIR, 'bridge', 'legacy-to-new.json'), {
    ...bridge,
    dumpedAt
  });
  console.log('Wrote bridge/legacy-to-new.json');

  writeReadme(dumpedAt);

  const { loadProvinces } = require('../src/lib/adminCatalog');
  const v1Count = loadProvinces('v1').length;
  const v2Count = loadProvinces('v2').length;
  console.log(`Verify: v1=${v1Count}, v2=${v2Count}`);

  if (v1Count !== 63 || v2Count !== 34) {
    throw new Error(`Unexpected province counts: v1=${v1Count} (expected 63), v2=${v2Count} (expected 34)`);
  }

  console.log('Seed complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
