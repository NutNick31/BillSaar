// Client-side calculator island: instant recalculation, URL sync, share buttons.
import { calculate, validateInput } from '../lib/calculate';
import { formatINR, formatINR0, formatNumber } from '../lib/format';
import { renderBreakdown, renderWarnings } from '../lib/render';
import { readState, stateToInput, writeState, type CalcState } from '../lib/url-state';
import type { FppcaData, InputField, Tariff } from '../lib/types';

const FIELD_NAME: Record<InputField, keyof CalcState> = {
  units: 'units',
  previousReading: 'prev',
  currentReading: 'curr',
  sanctionedLoadKw: 'kw',
  fppcaPaisePerUnit: 'fppca',
  trueUpAmount: 'tu',
  eligibleUnits: 'gju',
};
const TEXT_FIELDS = ['units', 'prev', 'curr', 'kw', 'fppca', 'tu', 'gju'] as const;

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function initCalculator(root: HTMLElement): void {
  const { tariff, fppca } = JSON.parse(root.querySelector('[data-calc-data]')!.textContent!) as {
    tariff: Tariff;
    fppca: FppcaData;
  };
  const form = root.querySelector('form')!;
  const q = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const input = (name: string) => form.elements.namedItem(name) as HTMLInputElement | null;
  const panels = {
    units: q('[data-panel="units"]'),
    meter: q('[data-panel="meter"]'),
    fppca: q('[data-panel="fppca"]'),
    gj: root.querySelector<HTMLElement>('[data-panel="gj"]'),
  };
  const out = {
    total: q('[data-total]'),
    perUnit: q('[data-per-unit]'),
    warnings: q('[data-warnings]'),
    breakdown: q('[data-breakdown]'),
    exampleNote: q('[data-example-note]'),
    share: q('[data-share]'),
    copy: q<HTMLButtonElement>('[data-copy]'),
    whatsapp: q<HTMLAnchorElement>('[data-whatsapp]'),
  };

  function readForm(): CalcState {
    const v = (n: string) => input(n)?.value.trim() ?? '';
    return {
      mode: (form.querySelector<HTMLInputElement>('input[name="mode"]:checked')?.value as CalcState['mode']) ?? 'units',
      units: v('units'),
      prev: v('prev'),
      curr: v('curr'),
      kw: v('kw'),
      fm: (form.elements.namedItem('fm') as HTMLSelectElement).value,
      fppca: v('fppca'),
      tu: v('tu'),
      gj: input('gj')?.checked ?? false,
      gju: v('gju'),
    };
  }

  function writeForm(s: CalcState): void {
    for (const n of TEXT_FIELDS) {
      const el = input(n);
      if (el) el.value = s[n];
    }
    form.querySelector<HTMLInputElement>(`input[name="mode"][value="${s.mode}"]`)!.checked = true;
    const fm = form.elements.namedItem('fm') as HTMLSelectElement;
    fm.value = [...fm.options].some((o) => o.value === s.fm) ? s.fm : '';
    const gj = input('gj');
    if (gj) gj.checked = s.gj;
    // Open "Advanced" when the link carries advanced values, so nothing is hidden from the user.
    if (s.fm || s.tu || s.gj || s.kw !== '1') form.querySelector('details')!.open = true;
  }

  function setError(name: string, message: string | null): void {
    const p = root.querySelector<HTMLElement>(`[data-error="${name}"]`);
    const el = input(name);
    if (p) {
      p.textContent = message ?? '';
      p.hidden = !message;
    }
    if (el) el.setAttribute('aria-invalid', message ? 'true' : 'false');
  }

  function shareUrl(s: CalcState): string {
    return location.origin + location.pathname + writeState(s);
  }

  function update(fromUser: boolean): void {
    const s = readForm();
    panels.units.hidden = s.mode !== 'units';
    panels.meter.hidden = s.mode !== 'meter';
    panels.fppca.hidden = s.fm !== 'custom';
    if (panels.gj) panels.gj.hidden = !s.gj;
    if (fromUser) out.exampleNote.hidden = true;

    const bill = stateToInput(s, fppca.months, currentMonth());
    const awaiting = s.mode === 'units' ? s.units === '' : s.prev === '' || s.curr === '';
    const errors = validateInput(bill).filter((e) => !(awaiting && ['units', 'previousReading', 'currentReading'].includes(e.field)));

    for (const n of TEXT_FIELDS) setError(n, null);
    for (const e of errors) setError(FIELD_NAME[e.field], e.message);

    if (awaiting || errors.length) {
      out.total.textContent = '—';
      out.perUnit.textContent = awaiting
        ? s.mode === 'units'
          ? 'Enter the units you used to see your bill.'
          : 'Enter both meter readings to see your bill.'
        : 'Fix the highlighted field to see your bill.';
      out.warnings.innerHTML = '';
      out.breakdown.innerHTML = '';
      out.share.hidden = true;
    } else {
      const r = calculate(tariff, bill, fppca);
      out.total.textContent = formatINR0(r.payable);
      out.perUnit.textContent =
        r.units > 0
          ? `${formatNumber(r.units)} units · about ${formatINR(r.payable / r.units)} per unit, all charges included`
          : 'Fixed charges are payable even with zero units.';
      out.warnings.innerHTML = renderWarnings(r.warnings);
      out.breakdown.innerHTML = renderBreakdown(r);
      out.share.hidden = false;
      const url = shareUrl(s);
      const text = `My ${tariff.company} electricity bill estimate: ${formatINR0(r.payable)} for ${formatNumber(r.units)} units. Check yours: ${url}`;
      out.whatsapp.href = `https://wa.me/?text=${encodeURIComponent(text)}`;
    }

    if (fromUser) history.replaceState(null, '', location.pathname + writeState(s) + location.hash);
  }

  const fromUrl = location.search ? readState(location.search, readForm()) : null;
  if (fromUrl) {
    writeForm(fromUrl);
    out.exampleNote.hidden = true;
  }
  form.addEventListener('input', () => update(true));
  form.addEventListener('change', () => update(true));
  form.addEventListener('submit', (e) => e.preventDefault());

  out.copy.addEventListener('click', async () => {
    const url = shareUrl(readForm());
    try {
      await navigator.clipboard.writeText(url);
      out.copy.textContent = 'Link copied';
    } catch {
      window.prompt('Copy this link:', url);
    }
    setTimeout(() => (out.copy.textContent = 'Copy link'), 2000);
  });

  update(false);
}
