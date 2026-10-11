import { describe, expect, it } from 'vitest';
import { BillInputError, calculate, gruhaJyothiEligibleUnits, perUnitCost, validateInput } from '../src/lib/calculate';
import { fppca, input, tariff } from './helpers';

const calc = (o: Parameters<typeof input>[0] = {}) => calculate(tariff, input(o), fppca);
const line = (r: ReturnType<typeof calc>, key: string) => r.lines.find((l) => l.key === key)?.amount;

describe('calculate: units', () => {
  it('0 units: fixed charge and its tax only', () => {
    const r = calc({ units: 0 });
    expect(line(r, 'energy')).toBe(0);
    expect(line(r, 'fixed')).toBe(150);
    expect(line(r, 'tax')).toBe(13.5);
    expect(r.gross).toBe(163.5);
    expect(r.payable).toBe(164);
  });

  it('1 unit keeps paise on lines and rounds only the total', () => {
    const r = calc({ units: 1 });
    expect(line(r, 'energy')).toBe(5.8);
    expect(line(r, 'pgSurcharge')).toBe(0.35);
    expect(line(r, 'fppca')).toBe(0.25);
    expect(line(r, 'tax')).toBe(14.02); // 9% of 155.80
    expect(r.gross).toBe(170.42);
    expect(r.payable).toBe(170);
  });

  it('100 units', () => {
    const r = calc({ units: 100 });
    expect(line(r, 'energy')).toBe(580);
    expect(line(r, 'pgSurcharge')).toBe(35);
    expect(line(r, 'fppca')).toBe(25);
    expect(line(r, 'tax')).toBe(65.7);
    expect(r.gross).toBe(855.7);
    expect(r.payable).toBe(856);
  });

  it('200 units', () => {
    expect(calc({ units: 200 }).payable).toBe(1548);
  });

  it('201 units', () => {
    const r = calc({ units: 201 });
    expect(line(r, 'tax')).toBe(118.42);
    expect(r.gross).toBe(1554.82);
    expect(r.payable).toBe(1555);
  });

  it('500 units', () => {
    const r = calc({ units: 500 });
    expect(r.gross).toBe(3624.5);
    expect(r.payable).toBe(3625);
  });

  it('every line has a human-readable formula', () => {
    const r = calc({ units: 250 });
    expect(r.lines.find((l) => l.key === 'energy')?.formula).toBe('250 units × ₹5.80');
    for (const l of r.lines) expect(l.formula.length).toBeGreaterThan(0);
  });
});

describe('calculate: meter readings', () => {
  it('uses current − previous', () => {
    const r = calculate(tariff, input({ units: undefined, previousReading: 1200, currentReading: 1450 }), fppca);
    expect(r.units).toBe(250);
    expect(r.payable).toBe(calc({ units: 250 }).payable);
  });

  it('rejects current < previous with a friendly error', () => {
    const i = input({ units: undefined, previousReading: 1450, currentReading: 1200 });
    expect(validateInput(i)).toEqual([expect.objectContaining({ field: 'currentReading' })]);
    expect(() => calculate(tariff, i, fppca)).toThrow(BillInputError);
  });

  it('rejects negative and non-numeric units', () => {
    expect(validateInput(input({ units: -5 }))[0]?.field).toBe('units');
    expect(validateInput(input({ units: Number.NaN }))[0]?.field).toBe('units');
    expect(validateInput(input({ units: undefined }))[0]?.field).toBe('units');
  });

  it('rejects a zero or negative sanctioned load', () => {
    expect(validateInput(input({ sanctionedLoadKw: 0 }))[0]?.field).toBe('sanctionedLoadKw');
  });
});

describe('calculate: fixed charge and FPPCA', () => {
  it('1 kW vs 3 kW', () => {
    expect(line(calc({ sanctionedLoadKw: 1 }), 'fixed')).toBe(150);
    const r3 = calc({ sanctionedLoadKw: 3 });
    expect(line(r3, 'fixed')).toBe(450);
    expect(line(r3, 'tax')).toBe(92.7); // 9% of (580 + 450)
    expect(r3.payable).toBe(1183);
  });

  it('defaults FPPCA to the latest month in the data', () => {
    const r = calc({ fppcaPaisePerUnit: undefined });
    expect(line(r, 'fppca')).toBe(25); // 2026-05: 25 paise × 100 units
  });

  it('uses an FPPCA override', () => {
    const r = calc({ fppcaPaisePerUnit: 47 });
    expect(line(r, 'fppca')).toBe(47);
    expect(r.payable).toBe(878);
  });
});

describe('calculate: true-up', () => {
  it('adds the true-up amount from the bill', () => {
    const r = calc({ trueUpAmount: 123.45 });
    expect(line(r, 'trueUp')).toBe(123.45);
    expect(r.gross).toBe(979.15);
    expect(r.payable).toBe(979);
  });

  it('warns when true-up is empty during its active months', () => {
    expect(calc({ billingMonth: '2026-10' }).warnings.some((w) => w.includes('True-Up'))).toBe(true);
    expect(calc({ billingMonth: '2027-06' }).warnings.some((w) => w.includes('True-Up'))).toBe(false);
    expect(calc({ billingMonth: '2026-10', trueUpAmount: 0 }).warnings.some((w) => w.includes('True-Up'))).toBe(false);
  });
});

describe('calculate: Gruha Jyothi', () => {
  const gj = (units: number, eligibleUnits?: number, extra = {}) =>
    calc({ units, gruhaJyothi: { enrolled: true, eligibleUnits }, ...extra });

  it('under the limit: nothing to pay', () => {
    const r = gj(100, 150);
    expect(r.subsidy).toBe(r.gross);
    expect(r.payable).toBe(0);
  });

  it('exactly at the limit: nothing to pay', () => {
    expect(gj(150, 150).payable).toBe(0);
  });

  it('under the limit: true-up is still payable', () => {
    expect(gj(100, 150, { trueUpAmount: 120 }).payable).toBe(120);
  });

  it('over the limit: pay only for the excess units', () => {
    const r = gj(180, 150);
    // 30 units × (5.80 + 0.35 + 0.25) + 9% × 30 × 5.80 = 207.66
    expect(r.payable).toBe(208);
    expect(r.warnings.some((w) => w.includes('30 units more'))).toBe(true);
  });

  it('over 200 units: not eligible, full bill', () => {
    const r = gj(250, 200);
    expect(r.subsidy).toBe(0);
    expect(r.payable).toBe(calc({ units: 250 }).payable);
    expect(r.warnings.some((w) => w.includes('does not apply'))).toBe(true);
  });

  it('clamps eligible units to 0..200', () => {
    expect(gj(200, 500).payable).toBe(0);
    expect(gj(10, -5).payable).toBe(calc({ units: 10 }).payable - 150 - 14); // fixed + its tax still covered
  });

  it('respects the pay_full_bill rule when configured', () => {
    const strict = { ...tariff, gruhaJyothi: { ...tariff.gruhaJyothi, overLimitRule: 'pay_full_bill' as const } };
    const r = calculate(strict, input({ units: 180, gruhaJyothi: { enrolled: true, eligibleUnits: 150 } }), fppca);
    expect(r.subsidy).toBe(0);
  });

  it('eligible units = baseline + 10%, capped at 200', () => {
    expect(gruhaJyothiEligibleUnits(tariff, 100)).toBeCloseTo(110);
    expect(gruhaJyothiEligibleUnits(tariff, 190)).toBe(200);
  });
});

describe('perUnitCost', () => {
  it('matches the marginal cost of one extra unit', () => {
    // 5.80 + 0.35 + 0.25 + 9% × 5.80
    expect(perUnitCost(tariff, 25)).toBeCloseTo(6.922, 6);
  });
});
