import { Platform } from 'react-native';
import * as IAP from 'react-native-iap';
import { functions } from './appwrite';
import { ExecutionMethod } from 'react-native-appwrite';
import { parseAppwriteResponse } from '../store/authStore';

export type PlanId = 'free' | 'starter' | 'pro' | 'growth' | 'agency';

/**
 * Safely extracts a product/purchase ID from an unknown object.
 * Checks `productId` first (iOS StoreKit shape) then `id` (Android Play shape),
 * since the two stores use different field names for the same concept.
 */
const getObjectProductId = (obj: unknown): string => {
  if (!obj || typeof obj !== 'object') return '';
  const o = obj as { productId?: unknown; id?: unknown };
  if (typeof o.productId === 'string') return o.productId;
  if (typeof o.id === 'string') return o.id;
  return '';
};

const getPurchaseProductId = (purchase: IAP.Purchase): string =>
  getObjectProductId(purchase as unknown);

const getPurchaseToken = (purchase: IAP.Purchase): string | null => {
  const value = purchase as unknown;
  if (!value || typeof value !== 'object') return null;
  if ('purchaseToken' in value) {
    const token = (value as { purchaseToken: unknown }).purchaseToken;
    if (typeof token === 'string') return token;
  }
  return null;
};

export const PLAN_TO_SKU: Record<Exclude<PlanId, 'free' | 'agency'>, { monthly: string; yearly: string }> = {
  starter: { monthly: 'pro.marketingtool.starter.monthly', yearly: 'pro.marketingtool.starter.yearly' },
  pro:     { monthly: 'pro.marketingtool.pro.monthly',     yearly: 'pro.marketingtool.pro.yearly' },
  growth:  { monthly: 'pro.marketingtool.growth.monthly',  yearly: 'pro.marketingtool.growth.yearly' },
};

const SUBSCRIPTION_SKUS = new Set(
  Object.values(PLAN_TO_SKU).flatMap(p => [p.monthly, p.yearly])
);
// Consumable "100 Extra Generations" product ID differs per store:
//   App Store = pro.marketingtool.tokens   |   Google Play = tokens
// Using the wrong ID on iOS returns "product not available", so resolve per platform.
export const TOKENS_SKU = Platform.OS === 'ios' ? 'pro.marketingtool.tokens' : 'tokens';
const CONSUMABLE_SKUS = [TOKENS_SKU];

// Map a purchased product id -> the entitlement it grants, so the app can unlock
// the moment StoreKit/Play confirms the transaction WITHOUT waiting on a server
// round-trip. This is the fix for Guideline 2.1(b) ("pro feature remained locked
// after purchase"): in Apple's sandbox the server verify can fail, but the
// finished transaction is itself proof of purchase and must unlock immediately.
// Covers BOTH the iOS flat skus and the Android Play product ids (starter /
// professional / growth).
export type Entitlement = { tier: 'starter' | 'pro' | 'growth'; generationsLimit: number };
const GROWTH_GENERATION_LIMIT = 9999;
const PRODUCT_TO_ENTITLEMENT: Record<string, Entitlement> = {
  'pro.marketingtool.starter.monthly': { tier: 'starter', generationsLimit: 200 },
  'pro.marketingtool.starter.yearly':  { tier: 'starter', generationsLimit: 200 },
  'pro.marketingtool.pro.monthly':     { tier: 'pro',      generationsLimit: 500 },
  'pro.marketingtool.pro.yearly':      { tier: 'pro',      generationsLimit: 500 },
  'pro.marketingtool.growth.monthly':  { tier: 'growth', generationsLimit: GROWTH_GENERATION_LIMIT },
  'pro.marketingtool.growth.yearly':   { tier: 'growth', generationsLimit: GROWTH_GENERATION_LIMIT },
  // Android Play subscription product ids:
  'starter':      { tier: 'starter',    generationsLimit: 200 },
  'professional': { tier: 'pro',        generationsLimit: 500 },
  'growth':       { tier: 'growth', generationsLimit: GROWTH_GENERATION_LIMIT },
};

export const entitlementForProduct = (productId: string): Entitlement | null =>
  PRODUCT_TO_ENTITLEMENT[productId] ?? null;

// ── Tier model (matches marketingtool.pro/pricing) ───────────────────────────
// Gates must be tier-aware, not binary: Starter buys the standard platform and
// 200 generations/month, but PRO-badged tools require the Pro tier or higher.
export type Tier = 'free' | 'starter' | 'pro' | 'growth' | 'enterprise';
export const TIER_RANK: Record<Tier, number> = { free: 0, starter: 1, pro: 2, growth: 3, enterprise: 4 };
// The token pack adds 100 generations, "added instantly to your account".
export const CREDITS_PER_TOKEN_PACK = 100;

// Resolve the user's effective tier from the server profile and the local
// purchase override (set by a finished StoreKit transaction; must win even
// when the server write failed, e.g. in Apple's sandbox). Highest tier wins.
export const effectiveTier = (
  profileTier?: string | null,
  override?: string | null
): Tier => {
  const p = (profileTier && profileTier in TIER_RANK ? profileTier : 'free') as Tier;
  const o = (override && override in TIER_RANK ? override : 'free') as Tier;
  return TIER_RANK[p] >= TIER_RANK[o] ? p : o;
};

export const hasProAccess = (profileTier?: string | null, override?: string | null): boolean =>
  TIER_RANK[effectiveTier(profileTier, override)] >= TIER_RANK.pro;

// Monthly generation allowance per tier (matches marketingtool.pro/pricing).
// The displayed/enforced limit MUST come from the user's plan, not the stale
// profile.generationsLimit (which defaults to 10) — otherwise a Growth member
// wrongly sees "0/10". Enterprise/Agency = effectively unlimited.
export const TIER_GENERATIONS: Record<Tier, number> = {
  free: 3,
  starter: 200,
  pro: 500,
  growth: 1500,
  enterprise: 999999,
};
export const generationsLimitForTier = (
  profileTier?: string | null,
  override?: string | null
): number => TIER_GENERATIONS[effectiveTier(profileTier, override)];

// ── Google Play subscription model ───────────────────────────────────────────
// iOS = 6 flat App Store product ids (PLAN_TO_SKU above). Google Play = 3
// subscription PRODUCTS, each with `monthly` / `yearly` BASE PLANS, purchased via
// the base plan's offerToken. Map each iOS-style sku -> {Play product id, base
// plan id}. NOTE: the "Pro" plan's Play product id is `professional` (NOT `pro`).
// This is why Android purchases failed: the app asked Play for
// `pro.marketingtool.growth.monthly`, which doesn't exist (the product is `growth`).
const ANDROID_SUB: Record<string, { product: string; basePlan: string }> = {
  'pro.marketingtool.starter.monthly': { product: 'starter',      basePlan: 'monthly' },
  'pro.marketingtool.starter.yearly':  { product: 'starter',      basePlan: 'yearly'  },
  'pro.marketingtool.pro.monthly':     { product: 'professional', basePlan: 'monthly' },
  'pro.marketingtool.pro.yearly':      { product: 'professional', basePlan: 'yearly'  },
  'pro.marketingtool.growth.monthly':  { product: 'growth',       basePlan: 'monthly' },
  'pro.marketingtool.growth.yearly':   { product: 'growth',       basePlan: 'yearly'  },
};
// Distinct Play subscription product ids to fetch on Android.
const ANDROID_SUB_PRODUCTS = [...new Set(Object.values(ANDROID_SUB).map(v => v.product))];

// Sentinel the UI checks for to silently ignore user-cancelled purchases.
export const PURCHASE_CANCELLED = '__PURCHASE_CANCELLED__';

const iapAvailable = (): boolean => {
  try {
    return !!(IAP && typeof (IAP as any).initConnection === 'function');
  } catch { return false; }
};

const IAP_UNAVAILABLE_ERROR = 'In-app purchase is not available on this device.';

export type PurchaseCallbacks = {
  onSuccess: (productId: string, entitlement?: Entitlement | null) => void;
  onError: (message: string) => void;
};

let initPromise: Promise<boolean> | null = null;

// react-native-iap v15 (OpenIAP) is EVENT-BASED: requestPurchase() only dispatches
// the native flow; the real outcome arrives via these listeners.
let purchaseSub: { remove: () => void } | null = null;
let errorSub: { remove: () => void } | null = null;
let callbacks: PurchaseCallbacks | null = null;
// requestPurchase's listener fires with only the purchase, so we stash the
// in-flight userId here for verifyPurchase to use.
let pendingUserId: string | null = null;

const isCancelError = (error: any): boolean => {
  const code = String(error?.code ?? '').toLowerCase();
  const msg = String(error?.message ?? '').toLowerCase();
  return code.includes('cancel') || msg.includes('cancel');
};

export const billingService = {
  async initialize() {
    if (!iapAvailable()) return false;
    if (initPromise) return initPromise;
    initPromise = (async () => {
      try {
        await IAP.initConnection();
        return true;
      } catch (err) {
        console.error('[Billing] Init error:', err);
        initPromise = null;
        return false;
      }
    })();
    return initPromise;
  },

  /**
   * Register the purchase result listeners. Idempotent — safe to call on every
   * screen mount. v15 delivers the purchase outcome HERE, not from requestPurchase.
   */
  startListeners(cb: PurchaseCallbacks) {
    callbacks = cb;
    if (!iapAvailable()) return;
    if (purchaseSub || errorSub) return; // already listening

    purchaseSub = IAP.purchaseUpdatedListener(async (purchase: IAP.Purchase) => {
      const productId = getPurchaseProductId(purchase);
      try {
        // Server verification is best-effort: sync the entitlement when we can,
        // but a missing/unreachable verify endpoint must NOT fail a real purchase.
        const userId = pendingUserId;
        if (userId) {
          try { await this.verifyPurchase(purchase, userId); }
          catch (e) {
            // Verification is intentionally best-effort/non-blocking here:
            // network/backend failures must not prevent finishing a valid store purchase.
            // We log for observability and continue so transaction finalization can proceed.
            console.warn('[Billing] verify (non-blocking) failed:', e);
          }
        } else {
          console.warn('[Billing] verify skipped: missing pendingUserId');
        }

        // ALWAYS finish the transaction so StoreKit's queue doesn't lock up and
        // block the next purchase. (iOS + Android.)
        try {
          // isConsumable must be true ONLY for the tokens consumable. The old
          // `!SUBSCRIPTION_SKUS.has(productId)` was wrong on Android: a sub's
          // productId there is `starter`/`professional`/`growth` (not the iOS
          // dotted skus), so it wrongly treated subs as consumable. CONSUMABLE_SKUS
          // holds the right id per platform ('tokens' / 'pro.marketingtool.tokens').
          await IAP.finishTransaction({
            purchase,
            isConsumable: CONSUMABLE_SKUS.includes(productId),
          });
        } catch (e) { console.warn('[Billing] finishTransaction failed:', e); }

        const purchaseToken = getPurchaseToken(purchase);
        if (Platform.OS === 'android' && purchaseToken) {
          try { await IAP.acknowledgePurchaseAndroid(purchaseToken); } catch { /* noop */ }
        }

        callbacks?.onSuccess(productId, entitlementForProduct(productId));
      } catch (err: any) {
        console.error('[Billing] purchaseUpdated handler error:', err);
        callbacks?.onError(err?.message || 'Could not complete the purchase.');
      } finally {
        pendingUserId = null;
      }
    });

    errorSub = IAP.purchaseErrorListener((error: IAP.PurchaseError) => {
      pendingUserId = null;
      if (isCancelError(error)) {
        callbacks?.onError(PURCHASE_CANCELLED);
        return;
      }
      console.error('[Billing] purchaseError:', error);
      callbacks?.onError((error as any)?.message || 'Purchase failed. Please try again.');
    });
  },

  stopListeners() {
    try { purchaseSub?.remove(); } catch { /* noop */ }
    try { errorSub?.remove(); } catch { /* noop */ }
    purchaseSub = null;
    errorSub = null;
    callbacks = null;
    pendingUserId = null;
  },

  async getProducts() {
    if (!iapAvailable()) return [];
    try {
      // Android fetches the 3 Play subscription PRODUCT ids; iOS fetches the 6 flat skus.
      const subSkus = Platform.OS === 'android' ? ANDROID_SUB_PRODUCTS : [...SUBSCRIPTION_SKUS];
      const prodSkus = [...CONSUMABLE_SKUS];

      const [subscriptions, products] = await Promise.all([
        subSkus.length > 0
          ? IAP.fetchProducts({ skus: subSkus, type: 'subs' })
          : Promise.resolve([]),
        prodSkus.length > 0
          ? IAP.fetchProducts({ skus: prodSkus, type: 'in-app' })
          : Promise.resolve([]),
      ]);

      return [...(products || []), ...(subscriptions || [])];
    } catch (err) {
      console.error('[Billing] Fetch products error:', err);
      return [];
    }
  },

  /**
   * Initiates the native purchase flow. The outcome is delivered via the
   * listeners registered in startListeners() — NOT this return value.
   * Returns { pending: true } when the store sheet launched.
   */
  async requestPurchase(sku: string, userId: string): Promise<{ success: boolean; pending?: boolean; error?: string }> {
    if (!iapAvailable()) {
      return { success: false, error: IAP_UNAVAILABLE_ERROR };
    }
    if (!purchaseSub || !errorSub) {
      return { success: false, error: 'In-app purchase service is still initializing (billing listeners are not ready). Please wait a few seconds and try again.' };
    }
    try {
      await this.initialize();
      const available = await this.getProducts();
      if (__DEV__) console.log('[Billing] Available products:', available.map((p: unknown) => getObjectProductId(p)));
      const isSub = SUBSCRIPTION_SKUS.has(sku);

      // ── Android subscriptions: map iOS-style sku -> Play product + base-plan
      // offer token. Google Play requires purchasing a base plan via its
      // offerToken, not a flat sku. (This is the fix for zero Android sales.)
      if (Platform.OS === 'android' && isSub) {
        const map = ANDROID_SUB[sku];
        type AndroidProduct = {
          // `subscriptionOfferDetailsAndroid` is the field name used by react-native-iap v15+,
          // while `subscriptionOfferDetails` was used in earlier v12/v13 releases.
          // Both are checked for compatibility with different library versions.
          subscriptionOfferDetailsAndroid?: Array<{ basePlanId: string; offerId?: string; offerToken?: string }>;
          subscriptionOfferDetails?: Array<{ basePlanId: string; offerId?: string; offerToken?: string }>;
        };
        const product = map && available.find((p: unknown) => getObjectProductId(p) === map.product) as AndroidProduct | undefined;
        if (!product) {
          return { success: false, error: available.length === 0
            ? 'Subscription products are not available yet. Please try again shortly.'
            : 'This plan is not available right now. Please contact support.' };
        }
        const offers = product.subscriptionOfferDetailsAndroid || product.subscriptionOfferDetails || [];
        // Prefer the bare base plan (no intro/promo offerId); else any offer on it.
        const offer = offers.find((o: any) => o.basePlanId === map.basePlan && !o.offerId)
                   || offers.find((o: any) => o.basePlanId === map.basePlan);
        if (!offer?.offerToken) {
          return { success: false, error: 'This plan is not available right now. Please contact support.' };
        }
        pendingUserId = userId;
        await IAP.requestPurchase({
          request: {
            android: {
              skus: [map.product],
              subscriptionOffers: [{ sku: map.product, offerToken: offer.offerToken }],
            },
          },
          type: 'subs',
        } as any);
        return { success: true, pending: true };
      }

      // ── iOS subscriptions + consumables (both platforms) ──
      const found = available.find((p: unknown) => getObjectProductId(p) === sku);
      if (!found) {
        const reason = available.length === 0
          ? 'Subscription products are not available yet. Please try again shortly.'
          : 'This plan is not available right now. Please contact support.';
        return { success: false, error: reason };
      }

      pendingUserId = userId;
      await IAP.requestPurchase({
        request: { apple: { sku }, google: { skus: [sku] } },
        type: isSub ? 'subs' : 'in-app',
      } as any);
      return { success: true, pending: true };
    } catch (err: any) {
      pendingUserId = null;
      console.error('[Billing] requestPurchase dispatch error:', err);
      return { success: false, error: err?.message || 'Could not start the purchase.' };
    }
  },

  // Best-effort server verification (entitlement sync). Never throw to caller in
  // a way that blocks the purchase — callers treat StoreKit success as success.
  async verifyPurchase(purchase: IAP.Purchase, userId: string) {
    if (!iapAvailable()) return { success: false, error: IAP_UNAVAILABLE_ERROR };
    try {
      const p = purchase as any;
      const payload: Record<string, unknown> = {
        userId,
        productId: p.productId || p.id,
        platform: Platform.OS,
      };
      if (Platform.OS === 'android') {
        payload.googlePurchaseToken = p.purchaseToken;
      } else {
        payload.appleReceipt = p.jwsRepresentationIOS || p.transactionReceipt;
        payload.transactionId = p.transactionId;
      }

      const execution = await functions.createExecution(
        'iap-verify',
        JSON.stringify(payload),
        false, '/', ExecutionMethod.POST
      );
      const result = parseAppwriteResponse(execution.responseBody);
      return result.success ? { success: true } : { success: false, error: result.error || 'Verification pending' };
    } catch (err: any) {
      console.warn('[Billing] Verification error:', err?.message);
      return { success: false, error: err?.message };
    }
  },

  async restorePurchases(userId: string) {
    if (!iapAvailable()) return { success: false, error: IAP_UNAVAILABLE_ERROR };
    try {
      // Must ensure the StoreKit connection is up first, or getAvailablePurchases
      // throws "Connection not initialized. Call initConnection() first".
      const ready = await this.initialize();
      if (!ready) return { success: false, error: 'Store is still starting up. Please try again in a moment.' };
      const purchases = await IAP.getAvailablePurchases();
      if (!purchases || purchases.length === 0) {
        return { success: false, error: 'No purchases found to restore.' };
      }
      const results = await Promise.allSettled(
        purchases.map((p) => this.verifyPurchase(p, userId))
      );
      const successCount = results.filter(
        (r) => r.status === 'fulfilled' && r.value.success
      ).length;
      // Resolve the highest entitlement among the restored purchases so the caller
      // can unlock Pro locally even when the server verify is unavailable (same
      // root cause as the purchase flow — must not depend on a server round-trip).
      const rank = { starter: 1, pro: 2, growth: 3 } as const;
      let entitlement: Entitlement | null = null;
      for (const p of purchases) {
        const pid = (p as any).productId || (p as any).id || '';
        const ent = entitlementForProduct(pid);
        if (ent && (!entitlement || rank[ent.tier] > rank[entitlement.tier])) {
          entitlement = ent;
        }
      }
      // Even if server verify is unavailable, having active purchases counts as restored.
      return { success: successCount > 0 || purchases.length > 0, count: successCount || purchases.length, entitlement };
    } catch (err: any) {
      console.error('[Billing] Restore error:', err);
      return { success: false, error: err?.message || 'Failed to restore purchases.' };
    }
  },

  async end() {
    // Only tear down the per-screen result listeners here. We deliberately do
    // NOT call IAP.endConnection() on screen unmount.
    //
    // Why: initialize() memoizes its result in `initPromise`. Calling
    // endConnection() on unmount killed the StoreKit connection while leaving
    // `initPromise` resolved to `true`, so the NEXT time the paywall opened,
    // initialize() returned the stale `true` without reconnecting. fetchProducts()
    // then came back empty ("Subscription products are not available yet") and
    // getAvailablePurchases() threw "Connection not initialized. Call
    // initConnection() first." — i.e. the first purchase worked, every later one
    // failed. Keeping the singleton connection alive for the app session makes
    // the memoized `initPromise` accurate. The OS reclaims it on app termination.
    this.stopListeners();
  }
};
