const fs = require('fs');
const path = require('path');
const { createCanvas } = require('@napi-rs/canvas');
const { SIGNATORIES_DIR } = require('./paths');

const INK = '#C8102E';
const DIAMETER = 500;

function bufferToDataUrl(buf, mime = 'image/png') {
  return `data:${mime};base64,${buf.toString('base64')}`;
}

function drawTextOnArc(ctx, text, cx, cy, radius, startAngle, endAngle, outward) {
  const chars = Array.from(String(text || '').toUpperCase());
  if (chars.length === 0) return;

  const sweep = endAngle - startAngle;
  const step = sweep / chars.length;

  ctx.save();
  ctx.fillStyle = INK;
  ctx.font = 'bold 28px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let i = 0; i < chars.length; i++) {
    const angle = startAngle + step * (i + 0.5);
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle + (outward ? Math.PI / 2 : -Math.PI / 2));
    ctx.fillText(chars[i], 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

function applyInkNoise(ctx, size) {
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 20) continue;
    if (Math.random() < 0.035) {
      d[i + 3] = Math.floor(d[i + 3] * 0.15);
    } else if (Math.random() < 0.02) {
      d[i] = Math.min(255, d[i] + 40);
      d[i + 1] = Math.min(255, d[i + 1] + 20);
      d[i + 2] = Math.min(255, d[i + 2] + 20);
      d[i + 3] = Math.floor(d[i + 3] * 0.7);
    }
  }
  ctx.putImageData(img, 0, 0);
}

function generateStampPng({ ringTop, ringBottom, diameterPx = DIAMETER } = {}) {
  const size = diameterPx;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;

  ctx.clearRect(0, 0, size, size);

  // Outer / inner rings
  ctx.strokeStyle = INK;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.46, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.40, 0, Math.PI * 2);
  ctx.stroke();

  // Simple star in center
  ctx.fillStyle = INK;
  const spikes = 5;
  const outerR = size * 0.12;
  const innerR = size * 0.05;
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = -Math.PI / 2 + (i * Math.PI) / spikes;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();

  // Top arc (upper half, reading left→right)
  drawTextOnArc(ctx, ringTop, cx, cy, size * 0.34, Math.PI * 0.95, Math.PI * 2.05, true);
  // Bottom arc (left→right along the lower curve; negative sweep)
  drawTextOnArc(ctx, ringBottom, cx, cy, size * 0.34, Math.PI * 0.85, Math.PI * 0.15, false);

  applyInkNoise(ctx, size);

  // Soft edge blur via second pass (draw onto slightly filtered canvas)
  const blurCanvas = createCanvas(size, size);
  const bctx = blurCanvas.getContext('2d');
  bctx.filter = 'blur(0.6px)';
  bctx.drawImage(canvas, 0, 0);

  return blurCanvas.toBuffer('image/png');
}

function generatePlaceholderSignaturePng() {
  const w = 420;
  const h = 160;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(40, 100);
  ctx.bezierCurveTo(80, 40, 140, 40, 180, 90);
  ctx.bezierCurveTo(210, 130, 250, 50, 300, 70);
  ctx.bezierCurveTo(340, 85, 360, 110, 380, 95);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(120, 110);
  ctx.quadraticCurveTo(200, 140, 280, 100);
  ctx.stroke();
  return canvas.toBuffer('image/png');
}

function loadSignatory(id = 'default') {
  const jsonPath = path.join(SIGNATORIES_DIR, `${id}.json`);
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Signatory not found: ${jsonPath}`);
  }

  const meta = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  const stampBuf = generateStampPng({
    ringTop: meta.stamp_ring_text || meta.authority_l1 || '',
    ringBottom: meta.stamp_bottom_text || ''
  });

  let signatureDataUrl = '';
  if (meta.signature_file) {
    const sigPath = path.join(SIGNATORIES_DIR, meta.signature_file);
    if (fs.existsSync(sigPath)) {
      signatureDataUrl = bufferToDataUrl(fs.readFileSync(sigPath));
    }
  }

  return {
    stampDataUrl: bufferToDataUrl(stampBuf),
    signatureDataUrl,
    meta
  };
}

module.exports = {
  generateStampPng,
  generatePlaceholderSignaturePng,
  loadSignatory,
  bufferToDataUrl
};
