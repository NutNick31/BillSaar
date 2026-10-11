// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  // TODO: replace with your production URL (your *.pages.dev address first, your own domain later).
  // Canonical URLs, Open Graph tags, the sitemap and robots.txt are all built from this.
  site: 'https://current-bill-calculator.pages.dev',
  output: 'static',
  trailingSlash: 'always',
  integrations: [sitemap({ filter: (page) => !page.includes('/404') })],
});
