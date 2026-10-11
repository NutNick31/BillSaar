// Shared by the Gruha Jyothi page (build time) and its island (browser).
import { calculate, gruhaJyothiEligibleUnits } from './calculate';
import { formatINR0, formatNumber } from './format';
import type { FppcaData, Tariff } from './types';

export type GjCheck = {
  eligible: number;
  status: 'within' | 'over' | 'ineligible';
  message: string;
  withGj: number;
  withoutGj: number;
};

/** Eligible units shown to users: rounded to a whole unit. */
export function eligibleFromBaseline(tariff: Tariff, baseline: number): number {
  return Math.round(gruhaJyothiEligibleUnits(tariff, baseline));
}

export function checkMonth(tariff: Tariff, fppca: FppcaData, units: number, eligible: number, kw = 1): GjCheck {
  const base = { units, sanctionedLoadKw: kw, trueUpAmount: 0 };
  const withGj = calculate(tariff, { ...base, gruhaJyothi: { enrolled: true, eligibleUnits: eligible } }, fppca).payable;
  const withoutGj = calculate(tariff, { ...base, gruhaJyothi: { enrolled: false } }, fppca).payable;
  const max = tariff.gruhaJyothi.maxFreeUnits;
  const e = Math.min(max, Math.max(0, eligible));
  if (units > max) {
    return { eligible: e, status: 'ineligible', withGj, withoutGj, message: `Over ${max} units: Gruha Jyothi does not apply this month. You pay the full ${formatINR0(withoutGj)}.` };
  }
  if (units <= e) {
    return { eligible: e, status: 'within', withGj, withoutGj, message: `Within your limit, with ${formatNumber(e - units)} units to spare. Estimated bill: ${formatINR0(withGj)} (it would be ${formatINR0(withoutGj)} without the scheme).` };
  }
  return { eligible: e, status: 'over', withGj, withoutGj, message: `${formatNumber(units - e)} units over your limit. You pay for those units: about ${formatINR0(withGj)}.` };
}
