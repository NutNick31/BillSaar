// Site-wide settings. Change the name or contact here; the production URL lives in astro.config.mjs.
export const SITE = {
  name: 'BillSaar',
  shortName: 'BillSaar',
  /** TODO: set a contact address before launch (shown on /about/). Leave empty to hide it. */
  contactEmail: '',
  ogImage: '/og.png',
};

export const ROUTES = {
  home: '/',
  about: '/about/',
  karnataka: '/karnataka/',
  bescomCalculator: '/karnataka/bescom-bill-calculator/',
  bescomRate: '/karnataka/bescom-per-unit-rate-2026/',
  bescomUnits: (units: number) => `/karnataka/bescom-bill-for-${units}-units/`,
  gruhaJyothi: '/karnataka/gruha-jyothi-free-units-calculator/',
  howToRead: '/karnataka/how-to-read-bescom-bill/',
  fppca: '/karnataka/what-is-fppca-true-up-charge/',
} as const;

export type Crumb = { name: string; path: string };
export const CRUMB_HOME: Crumb = { name: 'Home', path: ROUTES.home };
export const CRUMB_KARNATAKA: Crumb = { name: 'Karnataka', path: ROUTES.karnataka };
