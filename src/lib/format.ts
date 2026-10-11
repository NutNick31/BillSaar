const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
const inr0 = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0, minimumFractionDigits: 0 });
const num = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

/** Round to paise. EPSILON keeps 1.005 → 1.01 instead of 1.00. */
export function roundPaise(n: number): number {
  const r = Math.round((n + Math.sign(n) * Number.EPSILON) * 100) / 100;
  return r === 0 ? 0 : r;
}

export function roundRupee(n: number): number {
  const r = Math.round(n);
  return r === 0 ? 0 : r;
}

/** ₹1,450.00 */
export function formatINR(n: number): string {
  return inr.format(n);
}

/** ₹1,450 */
export function formatINR0(n: number): string {
  return inr0.format(n);
}

/** 1,250.5 */
export function formatNumber(n: number): string {
  return num.format(n);
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "2026-05" → "May 2026" */
export function formatMonth(ym: string): string {
  const [y, m] = ym.split('-');
  return `${MONTHS[Number(m) - 1]} ${y}`;
}

/** "2026-03-27" → "27 March 2026" */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
}

/** "2026-27" → "FY2026-27" */
export function formatFY(fy: string): string {
  return `FY${fy}`;
}
