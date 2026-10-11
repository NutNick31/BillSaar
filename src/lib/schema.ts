import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');
const yearMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'expected YYYY-MM');
const rupees = z.number().nonnegative();

export const LINE_KEYS = ['energy', 'fixed', 'pgSurcharge', 'fppca', 'tax', 'trueUp'] as const;
const lineKey = z.enum(LINE_KEYS);

export const TariffSchema = z
  .object({
    company: z.string().min(1),
    companyFullName: z.string().min(1),
    state: z.string().min(1),
    stateSlug: z.string().min(1),
    slug: z.string().min(1),
    category: z.literal('domestic'),
    financialYear: z.string().regex(/^\d{4}-\d{2}$/),
    effectiveFrom: isoDate,
    effectiveTo: isoDate,
    verified: z.boolean(),
    lastVerifiedOn: isoDate.nullable(),
    sources: z
      .array(z.object({ title: z.string().min(1), url: z.string().min(1), note: z.string().optional() }))
      .min(1),
    energyCharge: z.object({ type: z.literal('flat'), ratePerUnit: rupees }),
    fixedCharge: z.object({ perKwPerMonth: rupees }),
    pensionGratuitySurcharge: z.object({ ratePerUnit: rupees }),
    electricityTax: z.object({
      percent: z.number().min(0).max(100),
      appliesTo: z.array(lineKey.exclude(['tax'])).min(1),
      note: z.string().optional(),
    }),
    fppca: z.object({ source: z.string().min(1), userOverridable: z.boolean() }),
    trueUp: z.object({
      label: z.string().min(1),
      activeFrom: yearMonth,
      activeTo: yearMonth,
      householdSpecific: z.boolean(),
      note: z.string().optional(),
    }),
    gruhaJyothi: z.object({
      enabled: z.boolean(),
      maxFreeUnits: z.number().positive(),
      bufferPercent: z.number().min(0),
      baselineDescription: z.string().min(1),
      overLimitRule: z.enum(['pay_excess_units_only', 'pay_full_bill']),
      coveredLines: z.array(lineKey).min(1),
      note: z.string().optional(),
    }),
    history: z.array(
      z.object({ financialYear: z.string().regex(/^\d{4}-\d{2}$/), energyRatePerUnit: rupees, fixedPerKw: rupees }),
    ),
    exampleUnits: z.array(z.number().int().positive()).min(1),
  })
  .refine((t) => !t.verified || t.lastVerifiedOn !== null, {
    message: 'lastVerifiedOn is required when verified is true',
    path: ['lastVerifiedOn'],
  });

export const FppcaSchema = z
  .object({
    unit: z.literal('paise_per_unit'),
    verified: z.boolean(),
    lastVerifiedOn: isoDate.nullable(),
    source: z.string().min(1),
    months: z.record(yearMonth, z.number().min(-500).max(500)),
  })
  .refine((f) => Object.keys(f.months).length > 0, { message: 'at least one FPPCA month is required', path: ['months'] });

export const CompaniesSchema = z.object({
  states: z
    .array(
      z.object({
        name: z.string().min(1),
        slug: z.string().min(1),
        regulator: z.string().min(1),
        companies: z.array(
          z.object({
            name: z.string().min(1),
            fullName: z.string().min(1),
            slug: z.string().min(1),
            enabled: z.boolean(),
            area: z.string().min(1),
          }),
        ),
      }),
    )
    .min(1),
});

/** Parse a data file and fail the build with a readable message if it is invalid. */
export function parseData<T extends z.ZodType>(schema: T, raw: unknown, file: string): z.infer<T> {
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new Error(`Invalid data in ${file}:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
