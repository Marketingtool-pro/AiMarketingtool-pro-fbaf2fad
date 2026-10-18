// Real, localized store prices for the paywall. Pure (no react-native import)
// so it runs under `bun test`.
//
// Why: the paywall used to print hard-coded US dollar prices in every country,
// while Google Play / the App Store charge the local price (e.g. €549.99 in
// France for a plan the screen showed as "$999/year"). The screen must show
// what the store will actually charge.

export type StorePrice = { display: string; amount: number; currency: string };
export type AndroidSubMap = Record<string, { product: string; basePlan: string }>;

type Phase = { formattedPrice?: unknown; priceAmountMicros?: unknown; priceCurrencyCode?: unknown };
type Offer = { basePlanId?: unknown; offerId?: unknown; pricingPhases?: { pricingPhaseList?: Phase[] } };

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object';

const fromFlat = (p: Record<string, unknown>): StorePrice | null => {
  const display = typeof p.displayPrice === 'string' ? p.displayPrice : '';
  const amount = typeof p.price === 'number' ? p.price : Number.NaN;
  const currency = typeof p.currency === 'string' ? p.currency : '';
  return display && Number.isFinite(amount) ? { display, amount, currency } : null;
};

// The last pricing phase is the recurring price; earlier phases are trials or intro prices.
const fromOffer = (offer: Offer): StorePrice | null => {
  const list = offer.pricingPhases?.pricingPhaseList ?? [];
  const last = list[list.length - 1];
  if (!last || typeof last.formattedPrice !== 'string') return null;
  const amount = Number(last.priceAmountMicros) / 1_000_000;
  if (!Number.isFinite(amount)) return null;
  return { display: last.formattedPrice, amount, currency: String(last.priceCurrencyCode ?? '') };
};

const androidBasePlanPrice = (product: Record<string, unknown>, basePlan: string): StorePrice | null => {
  const raw = product.subscriptionOfferDetailsAndroid ?? product.subscriptionOfferDetails;
  const offers = (Array.isArray(raw) ? raw : []) as Offer[];
  const onPlan = offers.filter((o) => o.basePlanId === basePlan);
  const base = onPlan.find((o) => !o.offerId) ?? onPlan[0];
  return base ? fromOffer(base) : null;
};

/** Keyed by the app's sku (iOS-style subscription ids, plus the consumable id). */
export const extractStorePrices = (
  products: unknown[],
  platform: string,
  androidSubs: AndroidSubMap,
): Record<string, StorePrice> => {
  const prices: Record<string, StorePrice> = {};
  for (const p of products) {
    if (!isRecord(p) || typeof p.id !== 'string') continue;
    if (platform === 'android') {
      const plans = Object.entries(androidSubs).filter(([, v]) => v.product === p.id);
      for (const [sku, { basePlan }] of plans) {
        const price = androidBasePlanPrice(p, basePlan);
        if (price) prices[sku] = price;
      }
      if (plans.length > 0) continue;
    }
    const flat = fromFlat(p);
    if (flat) prices[p.id] = flat;
  }
  return prices;
};

/** Whole-percent yearly saving vs 12 monthly payments, or null if it can't be stated honestly. */
export const yearlySavingPercent = (monthly?: StorePrice, yearly?: StorePrice): number | null => {
  if (!monthly || !yearly || monthly.currency !== yearly.currency || monthly.amount <= 0) return null;
  const pct = Math.round((1 - yearly.amount / (monthly.amount * 12)) * 100);
  return pct > 0 ? pct : null;
};
