import { describe, expect, it } from 'vitest';
import bescomRaw from '../src/data/tariffs/karnataka/bescom.json';
import fppcaRaw from '../src/data/fppca/bescom.json';
import companiesRaw from '../src/data/companies.json';
import { CompaniesSchema, FppcaSchema, TariffSchema, parseData } from '../src/lib/schema';

describe('data files pass the schema', () => {
  it('tariffs/karnataka/bescom.json', () => expect(TariffSchema.safeParse(bescomRaw).success).toBe(true));
  it('fppca/bescom.json', () => expect(FppcaSchema.safeParse(fppcaRaw).success).toBe(true));
  it('companies.json', () => expect(CompaniesSchema.safeParse(companiesRaw).success).toBe(true));

  it('fails loudly when a required field is missing', () => {
    const { energyCharge: _omit, ...broken } = bescomRaw;
    expect(() => parseData(TariffSchema, broken, 'bescom.json')).toThrow(/energyCharge/);
  });

  it('requires lastVerifiedOn when verified is true', () => {
    expect(TariffSchema.safeParse({ ...bescomRaw, verified: true, lastVerifiedOn: null }).success).toBe(false);
  });

  it('every enabled company has a tariff file', () => {
    const enabled = CompaniesSchema.parse(companiesRaw).states.flatMap((s) => s.companies.filter((c) => c.enabled));
    expect(enabled.map((c) => c.slug)).toEqual([bescomRaw.slug]);
  });
});
