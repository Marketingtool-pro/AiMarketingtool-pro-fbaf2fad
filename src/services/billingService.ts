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
const CONSUMABLE_SKUS = ['pro.marketingtool.tokens'];
const productSkus = [...SUBSCRIPTION_SKUS, ...CONSUMABLE_SKUS];

const iapAvailable = (): boolean => {
  try {
    return !!(IAP && typeof (IAP as any).initConnection === 'function');
  } catch { return false; }
};

const IAP_UNAVAILABLE_ERROR = 'In-app purchase is not available on this device.';

export const billingService = {
  async initialize() {
    if (!iapAvailable()) return false;
    try {
      await IAP.initConnection();
      await IAP.flushFailedPurchasesCachedAsPendingAndroid();
      return true;
    } catch (err) {
      console.error('[Billing] Init error:', err);
      return false;
    }
  },

  async getProducts() {
    if (!iapAvailable()) return [];
    try {
      // Correctly split SKUs to avoid empty returns on certain StoreKit versions
      const subSkus = productSkus.filter(sku => SUBSCRIPTION_SKUS.has(sku));
      const prodSkus = productSkus.filter(sku => !SUBSCRIPTION_SKUS.has(sku));

      const [subscriptions, products] = await Promise.all([
        subSkus.length > 0 ? IAP.getSubscriptions({ skus: subSkus }) : Promise.resolve([]),
        prodSkus.length > 0 ? IAP.getProducts({ skus: prodSkus }) : Promise.resolve([]),
      ]);
      
      return [...products, ...subscriptions];
    } catch (err) {
      console.error('[Billing] Fetch products error:', err);
      return [];
    }
  },

  async requestPurchase(sku: string, userId: string) {
    if (!iapAvailable()) {
      return { success: false, error: IAP_UNAVAILABLE_ERROR };
    }
    try {
      const available = await this.getProducts();
      if (__DEV__) console.log('[Billing] Available products:', available.map((p: any) => p.productId));
      const found = available.find((p: any) => p.productId === sku);
      if (!found) {
        console.error('[Billing] Product not found in store:', sku, 'Available:', available.map((p: any) => p.productId));
        return { success: false, error: `Product "${sku}" is not available in your region. Please contact support.` };
      }
      let purchase = SUBSCRIPTION_SKUS.has(sku)
        ? await IAP.requestSubscription({ sku })
        : await IAP.requestPurchase({ sku });
      if (Array.isArray(purchase)) purchase = purchase[0];
      if (purchase) {
        return await this.verifyPurchase(purchase, userId);
      }
      return { success: false, error: 'Purchase cancelled' };
    } catch (err: any) {
      console.error('[Billing] Purchase error:', err);
      return { success: false, error: err.message };
    }
  },

  async verifyPurchase(purchase: IAP.Purchase, userId: string) {
    if (!iapAvailable()) return { success: false, error: IAP_UNAVAILABLE_ERROR };
    try {
      const payload: Record<string, unknown> = {
        userId,
        productId: purchase.productId,
        platform: Platform.OS,
      };
      if (Platform.OS === 'android') {
        payload.googlePurchaseToken = purchase.purchaseToken;
      } else {
        payload.appleReceipt = purchase.transactionReceipt;
        payload.transactionId = purchase.transactionId;
      }

      const execution = await functions.createExecution(
        'stripe-checkout',
        JSON.stringify(payload),
        false, '/', ExecutionMethod.POST
      );

      const result = parseAppwriteResponse(execution.responseBody);

      if (result.success) {
        if (Platform.OS === 'ios') {
          await IAP.finishTransaction({
            purchase,
            isConsumable: !SUBSCRIPTION_SKUS.has(purchase.productId),
          });
        } else {
          await IAP.acknowledgePurchaseAndroid({ token: purchase.purchaseToken! });
        }
        return { success: true };
      }

      return { success: false, error: result.error || 'Verification failed' };
    } catch (err: any) {
      console.error('[Billing] Verification error:', err);
      return { success: false, error: err.message };
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
      return { success: successCount > 0, count: successCount };
    } catch (err: any) {
      console.error('[Billing] Restore error:', err);
      return { success: false, error: err.message };
    }
  },

  async end() {
    if (!iapAvailable()) return;
    try { await IAP.endConnection(); } catch { /* noop */ }
  }
};
