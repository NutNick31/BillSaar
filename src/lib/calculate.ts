import { formatINR, formatMonth, formatNumber, roundPaise, roundRupee } from './format';
import type { BillInput, BillLine, BillResult, FieldError, FppcaData, LineKey, Tariff } from './types';

export const MAX_UNITS = 99_999;
export const MAX_KW = 100;

export class BillInputError extends Error {
  constructor(public readonly errors: FieldError[]) {
    super(errors.map((e) => e.message).join(' '));
    this.name = 'BillInputError';
  }
}

const isNum = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

/** Plain-language validation. An empty array means the input can be calculated. */
export function validateInput(input: BillInput): FieldError[] {
  const errors: FieldError[] = [];
  const hasUnits = input.units !== undefined;
  const hasReadings = 'previousReading' in input || 'currentReading' in input;

  if (hasUnits) {
    if (!isNum(input.units)) errors.push({ field: 'units', message: 'Enter the units as a number, for example 250.' });
    else if (input.units < 0) errors.push({ field: 'units', message: 'Units used cannot be negative.' });
    else if (input.units > MAX_UNITS) errors.push({ field: 'units', message: 'That is more than a home normally uses. Check the number on your bill.' });
  } else if (hasReadings) {
    const { previousReading: prev, currentReading: curr } = input;
    if (!isNum(prev) || prev < 0) errors.push({ field: 'previousReading', message: 'Enter the previous reading shown on your bill.' });
    if (!isNum(curr) || curr < 0) errors.push({ field: 'currentReading', message: 'Enter the current reading from your meter.' });
    if (isNum(prev) && isNum(curr) && prev >= 0 && curr >= 0) {
      if (curr < prev) {
        errors.push({
          field: 'currentReading',
          message: 'The current reading is lower than the previous one. If your meter was replaced, enter the units used instead.',
        });
      } else if (curr - prev > MAX_UNITS) {
        errors.push({ field: 'currentReading', message: 'That is more than a home normally uses. Check both readings.' });
      }
    }
  } else {
    errors.push({ field: 'units', message: 'Enter the units used this month.' });
  }

  if (!isNum(input.sanctionedLoadKw) || input.sanctionedLoadKw <= 0) {
    errors.push({ field: 'sanctionedLoadKw', message: 'Enter your sanctioned load in kW (1 kW if you are not sure).' });
  } else if (input.sanctionedLoadKw > MAX_KW) {
    errors.push({ field: 'sanctionedLoadKw', message: `Home connections are usually under ${MAX_KW} kW. Check your bill.` });
  }

  if (input.fppcaPaisePerUnit !== undefined && (!isNum(input.fppcaPaisePerUnit) || Math.abs(input.fppcaPaisePerUnit) > 500)) {
    errors.push({ field: 'fppcaPaisePerUnit', message: 'Enter FPPCA in paise per unit, for example 25.' });
  }
  if (input.trueUpAmount !== undefined && (!isNum(input.trueUpAmount) || Math.abs(input.trueUpAmount) > 100_000)) {
    errors.push({ field: 'trueUpAmount', message: 'Enter the true-up amount in rupees as printed on your bill.' });
  }
  if (input.gruhaJyothi.enrolled && input.gruhaJyothi.eligibleUnits !== undefined && !isNum(input.gruhaJyothi.eligibleUnits)) {
    errors.push({ field: 'eligibleUnits', message: 'Enter your Gruha Jyothi eligible units as a number.' });
  }
  return errors;
}

const rupee = (n: number) => formatINR(n);

/** All-in cost of one more unit (energy + P&G + FPPCA, plus tax on the taxable per-unit parts). */
export function perUnitCost(tariff: Tariff, fppcaPaise: number): number {
  const perUnit: Partial<Record<LineKey, number>> = {
    energy: tariff.energyCharge.ratePerUnit,
    pgSurcharge: tariff.pensionGratuitySurcharge.ratePerUnit,
    fppca: fppcaPaise / 100,
  };
  const base = Object.values(perUnit).reduce((a, b) => a + b, 0);
  const taxable = tariff.electricityTax.appliesTo.reduce((a, k) => a + (perUnit[k] ?? 0), 0);
  return base + (taxable * tariff.electricityTax.percent) / 100;
}

/** Eligible free units for a Gruha Jyothi baseline (average monthly use), before rounding. */
export function gruhaJyothiEligibleUnits(tariff: Tariff, baselineUnits: number): number {
  const gj = tariff.gruhaJyothi;
  return Math.min(gj.maxFreeUnits, Math.max(0, baselineUnits * (1 + gj.bufferPercent / 100)));
}

function monthInRange(month: string, from: string, to: string): boolean {
  return month >= from && month <= to;
}

/**
 * Pure, deterministic bill calculation. Throws BillInputError on invalid input.
 * Lines keep paise; only the payable total is rounded to the rupee.
 */
export function calculate(tariff: Tariff, input: BillInput, fppcaData: FppcaData): BillResult {
  const errors = validateInput(input);
  if (errors.length) throw new BillInputError(errors);

  const units = input.units ?? input.currentReading! - input.previousReading!;
  const kw = input.sanctionedLoadKw;
  const months = Object.keys(fppcaData.months).sort();
  const fppcaPaise = input.fppcaPaisePerUnit ?? fppcaData.months[months[months.length - 1]!]!;
  const trueUpAmount = input.trueUpAmount ?? 0;
  const tax = tariff.electricityTax;
  const u = formatNumber(units);

  // Amounts for a given number of units; reused to work out the Gruha Jyothi cover.
  const perUnitLines = (n: number) => ({
    energy: roundPaise(n * tariff.energyCharge.ratePerUnit),
    pgSurcharge: roundPaise(n * tariff.pensionGratuitySurcharge.ratePerUnit),
    fppca: roundPaise((n * fppcaPaise) / 100),
  });
  const fixed = roundPaise(kw * tariff.fixedCharge.perKwPerMonth);
  const full = { ...perUnitLines(units), fixed, trueUp: roundPaise(trueUpAmount) };
  const taxOn = (amounts: Partial<Record<LineKey, number>>) =>
    roundPaise((tax.appliesTo.reduce((a, k) => a + (amounts[k] ?? 0), 0) * tax.percent) / 100);
  const taxAmount = taxOn(full);
  const taxBaseText = tax.appliesTo
    .map((k) => `${LINE_SHORT[k]} ${rupee(full[k as keyof typeof full] ?? 0)}`)
    .join(' + ');

  const lines: BillLine[] = [
    {
      key: 'fixed',
      label: 'Fixed charges',
      formula: `${formatNumber(kw)} kW × ${rupee(tariff.fixedCharge.perKwPerMonth)}`,
      amount: fixed,
      explanation: 'Charged every month for your sanctioned load (connection size), even if you use no electricity.',
    },
    {
      key: 'energy',
      label: 'Energy charges',
      formula: `${u} units × ${rupee(tariff.energyCharge.ratePerUnit)}`,
      amount: full.energy,
      explanation: `The flat per-unit rate for homes in FY${tariff.financialYear}. There are no slabs: every unit costs the same.`,
    },
    {
      key: 'fppca',
      label: 'FPPCA (fuel & power purchase cost adjustment)',
      formula: `${u} units × ${formatNumber(fppcaPaise)} paise`,
      amount: full.fppca,
      explanation: 'A per-unit charge that changes every month with the cost of buying power. It is set by the electricity company under KERC rules.',
    },
    {
      key: 'pgSurcharge',
      label: 'Pension & gratuity surcharge',
      formula: `${u} units × ${rupee(tariff.pensionGratuitySurcharge.ratePerUnit)}`,
      amount: full.pgSurcharge,
      explanation: 'A per-unit surcharge that funds pensions and gratuity of electricity company employees.',
    },
    {
      key: 'tax',
      label: `Electricity tax (${formatNumber(tax.percent)}%)`,
      formula: `${formatNumber(tax.percent)}% of (${taxBaseText})`,
      amount: taxAmount,
      explanation: 'State electricity tax, charged as a percentage of some of the lines above.',
    },
  ];
  if (trueUpAmount !== 0) {
    lines.push({
      key: 'trueUp',
      label: tariff.trueUp.label,
      formula: 'Amount from your bill',
      amount: full.trueUp,
      explanation: 'A temporary charge that recovers FY2024-25 costs. It is different for every household, so copy it from your bill.',
    });
  }

  const gross = roundPaise(lines.reduce((a, l) => a + l.amount, 0));
  const warnings: string[] = [];
  let subsidy = 0;
  let subsidyFormula = '';

  const gj = tariff.gruhaJyothi;
  if (gj.enabled && input.gruhaJyothi.enrolled) {
    let eligible = input.gruhaJyothi.eligibleUnits;
    if (eligible === undefined) {
      eligible = gj.maxFreeUnits;
      warnings.push(`Enter your Gruha Jyothi eligible units from your bill. Until then we assume the maximum of ${gj.maxFreeUnits} units.`);
    }
    eligible = Math.min(gj.maxFreeUnits, Math.max(0, eligible));

    if (units > gj.maxFreeUnits) {
      warnings.push(`You used more than ${gj.maxFreeUnits} units, so Gruha Jyothi does not apply this month and the full bill is payable.`);
      subsidyFormula = `Not eligible: over ${gj.maxFreeUnits} units`;
    } else if (units <= eligible || gj.overLimitRule === 'pay_excess_units_only') {
      const coveredUnits = Math.min(units, eligible);
      const covered: Partial<Record<LineKey, number>> = { ...perUnitLines(coveredUnits), fixed };
      covered.tax = taxOn(covered);
      subsidy = roundPaise(gj.coveredLines.reduce((a, k) => a + (covered[k] ?? 0), 0));
      if (units <= eligible) {
        subsidyFormula = `${u} units are within your ${formatNumber(eligible)}-unit limit`;
      } else {
        subsidyFormula = `Covers ${formatNumber(coveredUnits)} of ${u} units`;
        warnings.push(
          `You used ${formatNumber(roundPaise(units - eligible))} units more than your Gruha Jyothi limit of ${formatNumber(eligible)}. You pay for those extra units.`,
        );
      }
    } else {
      subsidyFormula = `Over your ${formatNumber(eligible)}-unit limit`;
      warnings.push(`You used more than your Gruha Jyothi limit of ${formatNumber(eligible)} units, so the full bill is payable.`);
    }
  }

  if (input.trueUpAmount === undefined && input.billingMonth && monthInRange(input.billingMonth, tariff.trueUp.activeFrom, tariff.trueUp.activeTo)) {
    warnings.push(`Bills from ${formatMonth(tariff.trueUp.activeFrom)} to ${formatMonth(tariff.trueUp.activeTo)} include "${tariff.trueUp.label}". Enter the amount from your bill under Advanced for an exact total.`);
  }
  if (!tariff.verified || !fppcaData.verified) {
    warnings.push('These rates are still being verified against the official order. Check against your bill.');
  }

  return { units, lines, gross, subsidy, subsidyFormula, payable: roundRupee(gross - subsidy), warnings };
}

const LINE_SHORT: Record<LineKey, string> = {
  energy: 'energy',
  fixed: 'fixed',
  pgSurcharge: 'P&G surcharge',
  fppca: 'FPPCA',
  tax: 'tax',
  trueUp: 'true-up',
};
