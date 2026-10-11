// Build-time data access. Everything here is validated with zod; an invalid file fails the build.
import bescomRaw from '../data/tariffs/karnataka/bescom.json';
import bescomFppcaRaw from '../data/fppca/bescom.json';
import companiesRaw from '../data/companies.json';
import { CompaniesSchema, FppcaSchema, TariffSchema, parseData } from './schema';
import type { FppcaData } from './types';

export const bescom = parseData(TariffSchema, bescomRaw, 'src/data/tariffs/karnataka/bescom.json');
export const bescomFppca = parseData(FppcaSchema, bescomFppcaRaw, 'src/data/fppca/bescom.json');
export const companies = parseData(CompaniesSchema, companiesRaw, 'src/data/companies.json');

export const bescomVerified = bescom.verified && bescomFppca.verified;

/** Months in ascending order. */
export function fppcaMonths(f: FppcaData): string[] {
  return Object.keys(f.months).sort();
}

export function latestFppca(f: FppcaData): { month: string; paise: number } {
  const months = fppcaMonths(f);
  const month = months[months.length - 1]!;
  return { month, paise: f.months[month]! };
}
