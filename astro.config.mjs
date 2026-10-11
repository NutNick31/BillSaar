// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  // Production URL. Canonical URLs, Open Graph tags, the sitemap and robots.txt are all built from this.
  // Change it here if you move to your own domain (e.g. https://billsaar.in).
  site: 'https://www.billsaar.workers.dev',
  output: 'static',
  trailingSlash: 'always',
  integrations: [sitemap({ filter: (page) => !page.includes('/404') })],
});
