import bescomRaw from '../src/data/tariffs/karnataka/bescom.json';
import fppcaRaw from '../src/data/fppca/bescom.json';
import { FppcaSchema, TariffSchema } from '../src/lib/schema';
import type { BillInput } from '../src/lib/types';

export const tariff = TariffSchema.parse(bescomRaw);
export const fppca = FppcaSchema.parse(fppcaRaw);

/** 1 kW, FPPCA 25 paise, no Gruha Jyothi, no true-up — override as needed. */
export function input(overrides: Partial<BillInput> = {}): BillInput {
  return { units: 100, sanctionedLoadKw: 1, fppcaPaisePerUnit: 25, gruhaJyothi: { enrolled: false }, ...overrides };
}
