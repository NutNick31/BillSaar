// Build-time worked examples for content pages. Every rupee figure on a content page comes from here.
import { calculate, perUnitCost } from './calculate';
import { bescom, bescomFppca, latestFppca } from './data';

export const fppcaLatest = latestFppca(bescomFppca);

export type ExampleOptions = { kw?: number; gjEligible?: number; fppcaPaise?: number };

export function bescomBill(units: number, opts: ExampleOptions = {}) {
  return calculate(
    bescom,
    {
      units,
      sanctionedLoadKw: opts.kw ?? 1,
      fppcaPaisePerUnit: opts.fppcaPaise ?? fppcaLatest.paise,
      trueUpAmount: 0,
      gruhaJyothi: { enrolled: opts.gjEligible !== undefined, eligibleUnits: opts.gjEligible },
    },
    bescomFppca,
  );
}

export const bescomPerUnit = perUnitCost(bescom, fppcaLatest.paise);
