export function makeTicketCode(seed?: string): string {
  const raw = (seed || Math.random().toString(36).slice(2) + Date.now().toString(36))
    .replace(/[^a-z0-9]/gi, '')
    .toUpperCase();
  return (`SX${raw}`).slice(0, 12).padEnd(12, '0');
}

/** Deterministic QR-ish SVG (not a real QR encoder; unique per code). */
export function qrSvg(code: string): string {
  const size = 21;
  const cell = 8;
  const pad = 8;
  const dim = size * cell + pad * 2;
  const bits: boolean[][] = [];
  let h = 2166136261;
  for (let i = 0; i < code.length; i++) h = Math.imul(h ^ code.charCodeAt(i), 16777619);
  for (let y = 0; y < size; y++) {
    bits[y] = [];
    for (let x = 0; x < size; x++) {
      const finder =
        (x < 7 && y < 7) || (x >= size - 7 && y < 7) || (x < 7 && y >= size - 7);
      if (finder) {
        const fx = x < 7 ? x : x - (size - 7);
        const fy = y < 7 ? y : y - (size - 7);
        const ring = fx === 0 || fy === 0 || fx === 6 || fy === 6 || (fx >= 2 && fx <= 4 && fy >= 2 && fy <= 4);
        bits[y][x] = ring;
      } else {
        const n = Math.imul(h ^ (x * 374761393) ^ (y * 668265263), 1274126177);
        bits[y][x] = ((n >>> 16) & 1) === 1;
      }
    }
  }
  let rects = '';
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (bits[y][x]) {
        rects += `<rect x="${pad + x * cell}" y="${pad + y * cell}" width="${cell}" height="${cell}"/>`;
      }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dim} ${dim}" width="168" height="168" role="img" aria-label="Ticket ${code}"><rect width="${dim}" height="${dim}" fill="#F4F0E6"/><g fill="#1A1408">${rects}</g></svg>`;
}
