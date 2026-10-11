import type { z } from 'zod';
import type { CompaniesSchema, FppcaSchema, LINE_KEYS, TariffSchema } from './schema';

export type Tariff = z.infer<typeof TariffSchema>;
export type FppcaData = z.infer<typeof FppcaSchema>;
export type Companies = z.infer<typeof CompaniesSchema>;

export type LineKey = (typeof LINE_KEYS)[number];

export type BillInput = {
  /** kWh used this month; OR provide the two readings */
  units?: number;
  previousReading?: number;
  currentReading?: number;
  /** default 1 */
  sanctionedLoadKw: number;
  /** default: latest month from data */
  fppcaPaisePerUnit?: number;
  /** ₹ from the user's bill; default 0 */
  trueUpAmount?: number;
  gruhaJyothi: {
    enrolled: boolean;
    /** from the bill; clamped to 0..maxFreeUnits */
    eligibleUnits?: number;
  };
  /** "YYYY-MM" */
  billingMonth?: string;
};

export type BillLine = {
  key: LineKey;
  label: string;
  formula: string;
  amount: number;
  explanation: string;
};

export type BillResult = {
  units: number;
  lines: BillLine[];
  /** sum of lines, in rupees with paise */
  gross: number;
  subsidy: number;
  subsidyFormula: string;
  /** gross − subsidy, rounded to the nearest rupee */
  payable: number;
  warnings: string[];
};

export type InputField =
  | 'units'
  | 'previousReading'
  | 'currentReading'
  | 'sanctionedLoadKw'
  | 'fppcaPaisePerUnit'
  | 'trueUpAmount'
  | 'eligibleUnits';

export type FieldError = { field: InputField; message: string };
