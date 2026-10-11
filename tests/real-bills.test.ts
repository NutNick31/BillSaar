import { describe, expect, it } from 'vitest';
import fixtures from './fixtures/real-bills.json';
import { calculate } from '../src/lib/calculate';
import { fppca, tariff } from './helpers';

type Fixture = {
  _example?: boolean;
  description: string;
  billingMonth: string;
  units: number;
  sanctionedLoadKw: number;
  fppcaPaisePerUnit: number;
  trueUpAmount: number;
  gruhaJyothi: { enrolled: boolean; eligibleUnits: number | null };
  printedTotal: number;
};

const bills = (fixtures.bills as Fixture[]).filter((b) => !b._example);

describe('real BESCOM bills (within ±₹1 of the printed total)', () => {
  if (bills.length === 0) {
    it.todo('TODO: add real bills to tests/fixtures/real-bills.json');
    return;
  }
  for (const b of bills) {
    it(b.description, () => {
      const r = calculate(
        tariff,
        {
          units: b.units,
          sanctionedLoadKw: b.sanctionedLoadKw,
          fppcaPaisePerUnit: b.fppcaPaisePerUnit,
          trueUpAmount: b.trueUpAmount,
          gruhaJyothi: { enrolled: b.gruhaJyothi.enrolled, eligibleUnits: b.gruhaJyothi.eligibleUnits ?? undefined },
          billingMonth: b.billingMonth,
        },
        fppca,
      );
      expect(Math.abs(r.payable - b.printedTotal)).toBeLessThanOrEqual(1);
    });
  }
});
