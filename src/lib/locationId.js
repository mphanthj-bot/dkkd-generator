function padCode(n, width) {
  return String(Number(n)).padStart(width, '0');
}

function buildLocationId({ catalog, provinceCode, districtCode, wardCode }) {
  if (catalog !== 'v1' && catalog !== 'v2') {
    throw new Error(`Invalid catalog: ${catalog}`);
  }
  const p = padCode(provinceCode, 2);
  if (catalog === 'v2') {
    if (wardCode == null) return `v2:${p}`;
    return `v2:${p}-${padCode(wardCode, 5)}`;
  }
  const d = districtCode == null ? null : padCode(districtCode, 3);
  if (d == null) return `v1:${p}`;
  if (wardCode == null) return `v1:${p}-${d}`;
  return `v1:${p}-${d}-${padCode(wardCode, 5)}`;
}

function parseLocationId(id) {
  if (!id || typeof id !== 'string') return null;
  let m = id.match(/^v1:(\d{2})(?:-(\d{3}))?(?:-(\d{5}))?$/);
  if (m) {
    const out = { catalog: 'v1', provinceCode: m[1] };
    if (m[2]) out.districtCode = m[2];
    if (m[3]) out.wardCode = m[3];
    return out;
  }
  m = id.match(/^v2:(\d{2})(?:-(\d{5}))?$/);
  if (m) {
    const out = { catalog: 'v2', provinceCode: m[1] };
    if (m[2]) out.wardCode = m[2];
    return out;
  }
  return null;
}

function parentLocationIds(id) {
  const p = parseLocationId(id);
  if (!p) return [];
  const parents = [];
  if (p.catalog === 'v1') {
    if (p.wardCode && p.districtCode) {
      parents.push(buildLocationId({ catalog: 'v1', provinceCode: p.provinceCode, districtCode: p.districtCode }));
    }
    if (p.wardCode || p.districtCode) {
      parents.push(buildLocationId({ catalog: 'v1', provinceCode: p.provinceCode }));
    }
  } else if (p.wardCode) {
    parents.push(buildLocationId({ catalog: 'v2', provinceCode: p.provinceCode }));
  }
  return parents;
}

module.exports = { padCode, buildLocationId, parseLocationId, parentLocationIds };
