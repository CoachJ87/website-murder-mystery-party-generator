/**
 * Submit sitemap.xml to Google Search Console.
 *
 * Runs in two modes:
 *  1. Local (dev/manual): reads `.google-search-console-credentials.json` from repo root.
 *  2. CI (GitHub Actions): reads JSON from GSC_SERVICE_ACCOUNT_JSON env var.
 *
 * Either way, the service account must have "Owner" or "Full" permission on the
 * GSC property at https://search.google.com/search-console (Settings → Users and
 * permissions). `webmasters.readonly` is NOT enough — submission requires the
 * full `webmasters` scope.
 *
 * Usage:
 *   node scripts/submit-sitemap-gsc.mjs
 *
 * Exit code: 0 on success, 1 on failure (non-fatal — workflow can ignore).
 */

import { google } from 'googleapis';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SITE_URL = process.env.GSC_SITE_URL || 'https://mysterymaker.party';
const SITEMAP_URL = process.env.GSC_SITEMAP_URL || `${SITE_URL.replace(/\/$/, '')}/sitemap.xml`;
const LOCAL_CREDS_PATH = join(__dirname, '../.google-search-console-credentials.json');

async function loadCredentials() {
  if (process.env.GSC_SERVICE_ACCOUNT_JSON) {
    try {
      return JSON.parse(process.env.GSC_SERVICE_ACCOUNT_JSON);
    } catch (e) {
      throw new Error('GSC_SERVICE_ACCOUNT_JSON is set but not valid JSON: ' + e.message);
    }
  }
  if (existsSync(LOCAL_CREDS_PATH)) {
    return JSON.parse(readFileSync(LOCAL_CREDS_PATH, 'utf8'));
  }
  throw new Error(
    'No GSC credentials found. Set GSC_SERVICE_ACCOUNT_JSON env var (CI) or ' +
    'place .google-search-console-credentials.json in repo root (local).'
  );
}

async function submitSitemap() {
  console.log(`🔄 Submitting sitemap to Google Search Console`);
  console.log(`   Site:    ${SITE_URL}`);
  console.log(`   Sitemap: ${SITEMAP_URL}`);

  const credentials = await loadCredentials();

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/webmasters'],
  });

  const authClient = await auth.getClient();
  const searchconsole = google.searchconsole({ version: 'v1', auth: authClient });

  await searchconsole.sitemaps.submit({
    siteUrl: SITE_URL,
    feedpath: SITEMAP_URL,
  });

  console.log('✅ Sitemap submitted successfully.');
  console.log('   GSC will recrawl within 24-48h. Check Index Coverage report in 7-14 days.');
}

submitSitemap().catch((err) => {
  console.error('❌ Sitemap submission failed:', err.message);
  if (err.errors) console.error(JSON.stringify(err.errors, null, 2));
  process.exit(1);
});
