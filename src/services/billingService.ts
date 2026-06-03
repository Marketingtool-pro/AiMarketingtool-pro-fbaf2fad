import { Platform } from 'react-native';
import * as IAP from 'react-native-iap';
import type { EventSubscription } from 'react-native-iap';
import { functions } from './appwrite';
import { ExecutionMethod } from 'react-native-appwrite';
import { parseAppwriteResponse } from '../store/authStore';

export type PlanId = 'free' | 'starter' | 'pro' | 'growth' | 'agency';

export const PLAN_TO_SKU: Record<Exclude<PlanId, 'free' | 'agency'>, { monthly: string; yearly: string }> = {
  starter: { monthly: 'pro.marketingtool.starter.monthly', yearly: 'pro.marketingtool.starter.yearly' },
  pro:     { monthly: 'pro.marketingtool.pro.monthly',     yearly: 'pro.marketingtool.pro.yearly' },
  growth:  { monthly: 'pro.marketingtool.growth.monthly',  yearly: 'pro.marketingtool.growth.yearly' },
};

const SUBSCRIPTION_SKUS = new Set(
  Object.values(PLAN_TO_SKU).flatMap(p => [p.monthly, p.yearly])
);
const CONSUMABLE_SKUS = ['tokens'];

const iapAvailable = (): boolean => {
  try {
    return !!(IAP && typeof (IAP as any).initConnection === 'function');
  } catch { return false; }
};

const IAP_UNAVAILABLE_ERROR = 'In-app purchase is not available on this device.';
const PURCHASE_TIMEOUT_MS = 90_000;

type PurchaseResult = { success: boolean; error?: string; count?: number };

// ── Listener wiring ──────────────────────────────────────────────────────────
// v15 delivers purchases ONLY through purchaseUpdatedListener / purchaseErrorListener.
// We bridge those events back to the awaiting requestPurchase() call via this map,
// keyed by productId so concurrent flows don't cross.
type Pending = {
  resolve: (r: PurchaseResult) => void;
  userId: string;
  settled: boolean;
};
const pendingBySku = new Map<string, Pending>();

let updateSub: EventSubscription | null = null;
let errorSub: EventSubscription | null = null;
let initPromise: Promise<boolean> | null = null;

const skuOf = (p: any): string => p?.productId || p?.id || '';

const settle = (sku: string, result: PurchaseResult) => {
  const pending = pendingBySku.get(sku);
  if (pending && !pending.settled) {
    pending.settled = true;
    pendingBySku.delete(sku);
    pending.resolve(result);
  }
};

const isCancel = (err: any): boolean => {
  const code = String(err?.code || '').toLowerCase();
  const msg = String(err?.message || '').toLowerCase();
  return code.includes('cancel') || msg.includes('cancel') || code === 'e_user_cancelled';
};

const attachListeners = () => {
  if (updateSub || !iapAvailable()) return;

  updateSub = IAP.purchaseUpdatedListener(async (purchase: any) => {
    const sku = skuOf(purchase);
    const pending = pendingBySku.get(sku);
    // userId from the awaiting flow, or empty for restored/queued transactions
    const userId = pending?.userId || '';
    try {
      const verified = await finalizePurchase(purchase, userId);
      settle(sku, verified);
    } catch (e: any) {
      console.error('[Billing] purchaseUpdated handler error:', e);
      settle(sku, { success: false, error: e?.message || 'Purchase processing failed' });
    }
  });

  errorSub = IAP.purchaseErrorListener((error: any) => {
    console.warn('[Billing] purchaseError:', error?.code, error?.message);
    // We can't always know which SKU failed; settle the most recent pending flow.
    const lastSku = [...pendingBySku.keys()].pop();
    if (lastSku) {
      settle(lastSku, isCancel(error)
        ? { success: false, error: 'Purchase cancelled' }
        : { success: false, error: error?.message || 'The purchase could not be completed.' });
    }
  });
};

const detachListeners = () => {
  try { updateSub?.remove(); } catch { /* noop */ }
  try { errorSub?.remove(); } catch { /* noop */ }
  updateSub = null;
  errorSub = null;
};

/**
 * Verify + finish a single purchase. For iOS we rely on StoreKit 2 on-device
 * cryptographic verification (transactions delivered to purchaseUpdatedListener are
 * already framework-verified); we ALSO best-effort notify the backend so credits are
 * granted server-side, but a backend hiccup must NOT block the user's completed purchase.
 */
async function finalizePurchase(purchase: any, userId: string): Promise<PurchaseResult> {
  const sku = skuOf(purchase);
  const isConsumable = !SUBSCRIPTION_SKUS.has(sku);

  // 1. On-device StoreKit 2 verification (iOS). Real cryptographic check.
  if (Platform.OS === 'ios') {
    try {
      const verified = await (IAP as any).isTransactionVerifiedIOS?.(sku);
      if (verified === false) {
        return { success: false, error: 'Transaction could not be verified.' };
      }
    } catch (e) {
      // If the check itself is unavailable, the listener only emits verified txns anyway.
      console.warn('[Billing] isTransactionVerifiedIOS unavailable:', e);
    }
  }

  // 2. Best-effort server grant (does not block success). Safe if iap-verify is absent.
  if (userId) {
    void notifyBackend(purchase, userId).catch((e) =>
      console.warn('[Billing] backend grant deferred:', e?.message)
    );
  }

  // 3. Finish / acknowledge so the store stops retrying (Android refunds in 3d otherwise).
  try {
    if (Platform.OS === 'android' && purchase?.purchaseToken && !isConsumable) {
      await IAP.acknowledgePurchaseAndroid(purchase.purchaseToken);
    }
    await IAP.finishTransaction({ purchase, isConsumable });
  } catch (e) {
    console.warn('[Billing] finishTransaction warning:', e);
  }

  return { success: true };
}

/** Best-effort: tell the backend to grant entitlement. Tolerates a missing function. */
async function notifyBackend(purchase: any, userId: string): Promise<void> {
  const p = purchase;
  const payload: Record<string, unknown> = {
    userId,
    productId: skuOf(p),
    platform: Platform.OS,
  };
  if (Platform.OS === 'android') {
    payload.googlePurchaseToken = p.purchaseToken;
  } else {
    payload.appleReceipt = p.jwsRepresentationIOS || p.transactionReceipt;
    payload.transactionId = p.transactionId || p.id;
  }
  const execution = await functions.createExecution(
    'iap-verify',
    JSON.stringify(payload),
    false, '/', ExecutionMethod.POST
  );
  parseAppwriteResponse(execution.responseBody);
}

export const billingService = {
  async initialize() {
    if (!iapAvailable()) return false;
    if (initPromise) return initPromise;
    initPromise = (async () => {
      try {
        await IAP.initConnection();
        attachListeners();
        return true;
      } catch (err) {
        console.error('[Billing] Init error:', err);
        initPromise = null;
        return false;
      }
    })();
    return initPromise;
  },

  async getProducts() {
    if (!iapAvailable()) return [];
    try {
      await this.initialize();
      const subSkus = [...SUBSCRIPTION_SKUS];
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

  async requestPurchase(sku: string, userId: string): Promise<PurchaseResult> {
    if (!iapAvailable()) {
      return { success: false, error: IAP_UNAVAILABLE_ERROR };
    }
    try {
      const ok = await this.initialize();
      if (!ok) return { success: false, error: IAP_UNAVAILABLE_ERROR };

      const available = await this.getProducts();
      if (__DEV__) console.log('[Billing] Available products:', available.map(skuOf));
      const found = available.find((p: any) => skuOf(p) === sku);
      if (!found) {
        console.error('[Billing] Product not found in store:', sku, 'Available:', available.map(skuOf));
        const reason = available.length === 0
          ? 'Subscriptions are still loading from the store. Please try again in a moment.'
          : 'This plan is not available right now. Please try again later.';
        return { success: false, error: reason };
      }

      const isSub = SUBSCRIPTION_SKUS.has(sku);

      // Android subscriptions in v15 REQUIRE an offerToken from the fetched product.
      const androidOffers = isSub && Platform.OS === 'android'
        ? buildAndroidOffers(found, sku)
        : undefined;

      const request: any = {
        apple: { sku },
        google: androidOffers
          ? { skus: [sku], subscriptionOffers: androidOffers }
          : { skus: [sku] },
      };

      // Set up the awaiter BEFORE dispatching, so the listener can resolve it.
      const resultPromise = new Promise<PurchaseResult>((resolve) => {
        pendingBySku.set(sku, { resolve, userId, settled: false });
      });

      // Fire-and-forget: real outcome arrives via listeners (v15 contract).
      IAP.requestPurchase({ request, type: isSub ? 'subs' : 'in-app' } as any)
        .catch((err: any) => {
          if (isCancel(err)) settle(sku, { success: false, error: 'Purchase cancelled' });
          else settle(sku, { success: false, error: err?.message || 'Could not start the purchase.' });
        });

      const timeout = new Promise<PurchaseResult>((resolve) =>
        setTimeout(() => {
          settle(sku, { success: false, error: 'Purchase timed out. If you were charged, tap Restore Purchases.' });
          resolve({ success: false, error: 'Purchase timed out. If you were charged, tap Restore Purchases.' });
        }, PURCHASE_TIMEOUT_MS)
      );

      return await Promise.race([resultPromise, timeout]);
    } catch (err: any) {
      console.error('[Billing] Purchase error:', err);
      pendingBySku.delete(sku);
      return { success: false, error: err?.message || 'Could not complete the purchase.' };
    }
  },

  async restorePurchases(userId: string): Promise<PurchaseResult> {
    if (!iapAvailable()) return { success: false, error: IAP_UNAVAILABLE_ERROR };
    try {
      await this.initialize();
      const purchases = await IAP.getAvailablePurchases();
      if (!purchases || purchases.length === 0) {
        return { success: false, error: 'No purchases found to restore.' };
      }
      const results = await Promise.allSettled(
        purchases.map((p: any) => finalizePurchase(p, userId))
      );
      const successCount = results.filter(
        (r) => r.status === 'fulfilled' && r.value.success
      ).length;
      return { success: successCount > 0, count: successCount };
    } catch (err: any) {
      console.error('[Billing] Restore error:', err);
      return { success: false, error: err?.message };
    }
  },

  async end() {
    if (!iapAvailable()) return;
    detachListeners();
    pendingBySku.clear();
    initPromise = null;
    try { await IAP.endConnection(); } catch { /* noop */ }
  }
};

/** Extract a valid Android subscription offerToken for the requested base plan / SKU. */
function buildAndroidOffers(product: any, sku: string): Array<{ sku: string; offerToken: string }> | undefined {
  const details = product?.subscriptionOfferDetailsAndroid;
  if (!Array.isArray(details) || details.length === 0) return undefined;
  const offerToken = details[0]?.offerToken;
  if (!offerToken) return undefined;
  return [{ sku, offerToken }];
}
