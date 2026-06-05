import { Platform } from 'react-native';
import * as IAP from 'react-native-iap';
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
// Consumable "100 Extra Generations" product ID differs per store:
//   App Store = pro.marketingtool.tokens   |   Google Play = tokens
// Using the wrong ID on iOS returns "product not available", so resolve per platform.
export const TOKENS_SKU = Platform.OS === 'ios' ? 'pro.marketingtool.tokens' : 'tokens';
const CONSUMABLE_SKUS = [TOKENS_SKU];

// Sentinel the UI checks for to silently ignore user-cancelled purchases.
export const PURCHASE_CANCELLED = '__PURCHASE_CANCELLED__';

const iapAvailable = (): boolean => {
  try {
    return !!(IAP && typeof (IAP as any).initConnection === 'function');
  } catch { return false; }
};

const IAP_UNAVAILABLE_ERROR = 'In-app purchase is not available on this device.';

export type PurchaseCallbacks = {
  onSuccess: (productId: string) => void;
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
      const p = purchase as any;
      const productId = p.productId || p.id || '';
      try {
        // Server verification is best-effort: sync the entitlement when we can,
        // but a missing/unreachable verify endpoint must NOT fail a real purchase.
        try { await this.verifyPurchase(purchase, pendingUserId || ''); }
        catch (e) { console.warn('[Billing] verify (non-blocking) failed:', e); }

        // ALWAYS finish the transaction so StoreKit's queue doesn't lock up and
        // block the next purchase. (iOS + Android.)
        try {
          await IAP.finishTransaction({
            purchase,
            isConsumable: !SUBSCRIPTION_SKUS.has(productId),
          });
        } catch (e) { console.warn('[Billing] finishTransaction failed:', e); }

        if (Platform.OS === 'android' && p.purchaseToken) {
          try { await IAP.acknowledgePurchaseAndroid(p.purchaseToken); } catch { /* noop */ }
        }

        callbacks?.onSuccess(productId);
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
      return { success: false, error: 'Store is still starting up. Please try again in a moment.' };
    }
    try {
      await this.initialize();
      const available = await this.getProducts();
      if (__DEV__) console.log('[Billing] Available products:', available.map((p: any) => p.id || p.productId));
      const found = available.find((p: any) => (p.id || p.productId) === sku);
      if (!found) {
        const reason = available.length === 0
          ? 'Subscription products are not available yet. Please try again shortly.'
          : 'This plan is not available right now. Please contact support.';
        return { success: false, error: reason };
      }

      const isSub = SUBSCRIPTION_SKUS.has(sku);
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
      // Even if server verify is unavailable, having active purchases counts as restored.
      return { success: successCount > 0 || purchases.length > 0, count: successCount || purchases.length };
    } catch (err: any) {
      console.error('[Billing] Restore error:', err);
      return { success: false, error: err.message };
    }
  },

  async end() {
    this.stopListeners();
    if (!iapAvailable()) return;
    try { await IAP.endConnection(); } catch { /* noop */ }
  }
};
