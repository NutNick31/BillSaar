import type { BillInput } from './types';

// Calculator inputs <-> query string, e.g. ?units=250&kw=2&gj=1&gju=150
// Values are kept as the strings the user typed so the form round-trips exactly.

export type CalcState = {
  mode: 'units' | 'meter';
  units: string;
  prev: string;
  curr: string;
  kw: string;
  /** FPPCA month "YYYY-MM", or "custom" to use `fppca` */
  fm: string;
  fppca: string;
  tu: string;
  gj: boolean;
  gju: string;
};

export const DEFAULT_STATE: CalcState = {
  mode: 'units',
  units: '',
  prev: '',
  curr: '',
  kw: '1',
  fm: '',
  fppca: '',
  tu: '',
  gj: false,
  gju: '',
};

const NUMERIC = /^-?\d{0,7}(\.\d{0,3})?$/;
const clean = (v: string | null): string | undefined => {
  if (v === null) return undefined;
  const t = v.trim();
  return NUMERIC.test(t) ? t : undefined;
};

export function readState(search: string, base: CalcState = DEFAULT_STATE): CalcState {
  const p = new URLSearchParams(search);
  const s: CalcState = { ...base };
  for (const key of ['units', 'prev', 'curr', 'kw', 'fppca', 'tu', 'gju'] as const) {
    const v = clean(p.get(key));
    if (v !== undefined) s[key] = v;
  }
  const fm = p.get('fm');
  if (fm && (fm === 'custom' || /^\d{4}-(0[1-9]|1[0-2])$/.test(fm))) s.fm = fm;
  if (p.get('mode') === 'meter' || (!p.has('units') && (p.has('prev') || p.has('curr')))) s.mode = 'meter';
  if (p.has('gj')) s.gj = p.get('gj') === '1';
  return s;
}

/** Only non-default, relevant values are written so shared links stay short. */
export function writeState(s: CalcState): string {
  const p = new URLSearchParams();
  if (s.mode === 'units') {
    if (s.units) p.set('units', s.units);
  } else {
    p.set('mode', 'meter');
    if (s.prev) p.set('prev', s.prev);
    if (s.curr) p.set('curr', s.curr);
  }
  if (s.kw && s.kw !== DEFAULT_STATE.kw) p.set('kw', s.kw);
  if (s.fm === 'custom') {
    p.set('fm', 'custom');
    if (s.fppca) p.set('fppca', s.fppca);
  } else if (s.fm) {
    p.set('fm', s.fm);
  }
  if (s.tu) p.set('tu', s.tu);
  if (s.gj) {
    p.set('gj', '1');
    if (s.gju) p.set('gju', s.gju);
  }
  const q = p.toString();
  return q ? `?${q}` : '';
}

/** "" → undefined, "12.5" → 12.5, "abc" → NaN (so validation can complain). */
export function toNumber(v: string): number | undefined {
  const t = v.trim();
  if (t === '') return undefined;
  return Number(t);
}

/** Turn form state into calculator input. `fppcaMonths` maps "YYYY-MM" → paise. */
export function stateToInput(s: CalcState, fppcaMonths: Record<string, number>, billingMonth?: string): BillInput {
  let fppcaPaisePerUnit: number | undefined;
  if (s.fm === 'custom') fppcaPaisePerUnit = toNumber(s.fppca);
  else if (s.fm && s.fm in fppcaMonths) fppcaPaisePerUnit = fppcaMonths[s.fm];
  return {
    ...(s.mode === 'units'
      ? { units: toNumber(s.units) }
      : { previousReading: toNumber(s.prev), currentReading: toNumber(s.curr) }),
    sanctionedLoadKw: toNumber(s.kw) ?? 1,
    fppcaPaisePerUnit,
    trueUpAmount: toNumber(s.tu),
    gruhaJyothi: { enrolled: s.gj, eligibleUnits: toNumber(s.gju) },
    billingMonth,
  };
}
