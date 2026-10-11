import { eligibleFromBaseline, checkMonth } from '../lib/gruha-jyothi';
import { validateInput } from '../lib/calculate';
import { formatNumber } from '../lib/format';
import type { FppcaData, Tariff } from '../lib/types';

export function initGruhaJyothi(root: HTMLElement): void {
  const { tariff, fppca } = JSON.parse(root.querySelector('[data-gj-data]')!.textContent!) as { tariff: Tariff; fppca: FppcaData };
  const field = (n: string) => root.querySelector<HTMLInputElement>(`[name="${n}"]`)!;
  const out = (n: string) => root.querySelector<HTMLElement>(`[data-out="${n}"]`)!;
  const num = (v: string) => (v.trim() === '' ? undefined : Number(v));
  let eligibleTouched = false;

  const update = () => {
    const baseline = num(field('baseline').value);
    if (baseline !== undefined && Number.isFinite(baseline) && baseline >= 0) {
      const e = eligibleFromBaseline(tariff, baseline);
      out('eligible').textContent = `${formatNumber(e)} units`;
      if (!eligibleTouched) field('eligible').value = String(e);
    } else {
      out('eligible').textContent = baseline === undefined ? '—' : 'Enter a number';
    }

    const units = num(field('units').value);
    const eligible = num(field('eligible').value);
    const errors = units === undefined ? [] : validateInput({ units, sanctionedLoadKw: 1, gruhaJyothi: { enrolled: true, eligibleUnits: eligible } });
    if (units === undefined || eligible === undefined || !Number.isFinite(eligible) || errors.length) {
      out('status').textContent = errors[0]?.message ?? 'Enter this month’s units and your eligible units.';
      out('status').dataset.status = '';
      return;
    }
    const r = checkMonth(tariff, fppca, units, eligible);
    out('status').textContent = r.message;
    out('status').dataset.status = r.status;
  };

  root.addEventListener('input', (e) => {
    if ((e.target as HTMLInputElement).name === 'eligible') eligibleTouched = true;
    update();
  });
  root.querySelector('form')?.addEventListener('submit', (e) => e.preventDefault());
  update();
}
