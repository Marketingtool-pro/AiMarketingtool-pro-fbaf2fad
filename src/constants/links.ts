// Single source of truth for outbound URLs. These were previously duplicated as
// string literals across ProfileScreen, ContactScreen, SubscriptionScreen,
// SettingsScreen, TermsScreen and PrivacyScreen, which is how TUTORIALS ended up
// pointing at /blog/ on one screen and nowhere at all on another.
//
// All verified live (HTTP 200) at time of writing.

const SITE = 'https://marketingtool.pro';

export const LINKS = {
  /** Help centre / knowledge base. */
  HELP: `${SITE}/help/`,
  /** Contact form. */
  CONTACT: `${SITE}/contact/`,
  /** Tutorials. Product owner specified /blog/ as the tutorial destination. */
  TUTORIALS: `${SITE}/blog/`,
  /** Plans and pricing. */
  PRICING: `${SITE}/pricing/`,
  /**
   * Billing fallback for web/desktop, where neither app store manages the
   * subscription. NOTE: `${SITE}/account/billing` 404s — billing is managed
   * inside the web app, so this deliberately points at the web app root.
   */
  BILLING: 'https://app.marketingtool.pro',
  /** Verified 200. The bare `/terms` and `/privacy` paths are 404 — do not use them. */
  TERMS: `${SITE}/terms-policy/`,
  PRIVACY: `${SITE}/privacy-policy/`,
  /** Web app root. */
  APP: 'https://app.marketingtool.pro',
} as const;

export const SUPPORT_EMAIL = 'help@marketingtool.pro';

/** Build a mailto: URL with an encoded subject and optional body. */
export function supportMailto(subject: string, body?: string): string {
  const params = [`subject=${encodeURIComponent(subject)}`];
  if (body) params.push(`body=${encodeURIComponent(body)}`);
  return `mailto:${SUPPORT_EMAIL}?${params.join('&')}`;
}
