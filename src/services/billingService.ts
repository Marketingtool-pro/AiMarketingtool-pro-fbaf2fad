import { Platform } from 'react-native';
import * as IAP from 'react-native-iap';
import { functions } from './appwrite';
import { ExecutionMethod } from 'react-native-appwrite';

const productSkus = [
  'pro.marketingtool.starter.monthly',
  'pro.marketingtool.starter.yearly',
  'pro.marketingtool.pro.monthly',
  'pro.marketingtool.pro.yearly',
  'pro.marketingtool.growth.monthly',
  'pro.marketingtool.growth.yearly',
  'pro.marketingtool.tokens',
];

const iapAvailable = (): boolean => {
  try {
    return !!(IAP && typeof (IAP as any).initConnection === 'function');
  } catch { return false; }
};

const IAP_UNAVAILABLE_ERROR =
  'In-app purchase is not available on this device.';

const SUBSCRIPTION_SKUS = new Set([
  'pro.marketingtool.starter.monthly',
  'pro.marketingtool.starter.yearly',
  'pro.marketingtool.pro.monthly',
  'pro.marketingtool.pro.yearly',
  'pro.marketingtool.growth.monthly',
  'pro.marketingtool.growth.yearly',
]);

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
      const [products, subscriptions] = await Promise.all([
        IAP.getProducts({ skus: productSkus }),
        IAP.getSubscriptions({ skus: productSkus }),
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
      console.log('[Billing] Available products:', available.map((p: any) => p.productId));
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

      const result = JSON.parse(execution.responseBody);

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
