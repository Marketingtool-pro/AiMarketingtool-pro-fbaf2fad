import { Platform } from 'react-native';
import * as IapExports from 'react-native-iap';
const IAP = IapExports as any;
import { functions } from './appwrite';
import { ExecutionMethod } from 'react-native-appwrite';

// Native Product IDs (matching App Store & Google Play)
// Both 'pro_growth_*' and 'pro_alltools_*' are listed for backwards compatibility
const productSkus = Platform.select({
  ios: [
    'pro_starter_monthly',
    'pro_starter_yearly',
    'pro_professional_monthly',
    'pro_professional_yearly',
    'pro_growth_monthly',
    'pro_growth_yearly',
    'pro_alltools_monthly',
    'pro_alltools_yearly',
    'tokens_100',
  ],
  android: [
    'pro_starter_monthly',
    'pro_starter_yearly',
    'pro_professional_monthly',
    'pro_professional_yearly',
    'pro_growth_monthly',
    'pro_growth_yearly',
    'pro_alltools_monthly',
    'pro_alltools_yearly',
    'tokens_100',
  ],
}) || [];

// Map product IDs to subscription tiers (must match backend stripe-checkout/main.js)
const productToTier: Record<string, string> = {
  'pro_starter_monthly': 'starter',
  'pro_starter_yearly': 'starter',
  'pro_professional_monthly': 'pro',
  'pro_professional_yearly': 'pro',
  'pro_growth_monthly': 'alltools',
  'pro_growth_yearly': 'alltools',
  'pro_alltools_monthly': 'alltools',
  'pro_alltools_yearly': 'alltools',
  'tokens_100': 'tokens',
};

let iapReady = false;

export const billingService = {
  // Initialize connection to store
  async initialize() {
    try {
      if (typeof IAP.initConnection !== 'function') {
        console.warn('[Billing] IAP module not available (dev build or Expo Go)');
        return false;
      }
      await IAP.initConnection();
      if (Platform.OS === 'android') {
        await IAP.flushFailedPurchasesCachedAsPendingAndroid();
      }
      iapReady = true;
      return true;
    } catch (err) {
      console.error('[Billing] Init error:', err);
      return false;
    }
  },

  // Fetch products from store (uses queryProductDetailsAsync internally in react-native-iap 14+)
  async getProducts() {
    try {
      const subSkus = productSkus.filter(s => s.includes('monthly') || s.includes('yearly'));
      const prodSkus = productSkus.filter(s => !s.includes('monthly') && !s.includes('yearly'));
      const subscriptions = await IAP.getSubscriptions({ skus: subSkus });
      const products = prodSkus.length > 0 ? await IAP.getProducts({ skus: prodSkus }) : [];
      return [...products, ...subscriptions];
    } catch (err) {
      console.error('[Billing] Fetch products error:', err);
      return [];
    }
  },

  // Start purchase flow (uses ProductDetails API / queryProductDetailsAsync on Android)
  async requestPurchase(sku: string, userId: string) {
    if (!iapReady || typeof IAP.requestSubscription !== 'function') {
      throw new Error('In-app purchases not available');
    }
    try {
      let purchase;
      if (sku.includes('monthly') || sku.includes('yearly')) {
        // Handle Subscription — react-native-iap 14+ requires subscriptionOffers on Android
        if (Platform.OS === 'android') {
          // Fetch subscription details to get offerToken (required by BillingClient 5+)
          const subs = await IAP.getSubscriptions({ skus: [sku] });
          const sub = subs.find((s: any) => s.productId === sku);
          if (sub?.subscriptionOfferDetails?.length > 0) {
            const offerToken = sub.subscriptionOfferDetails[0].offerToken;
            purchase = await IAP.requestSubscription({
              subscriptionOffers: [{ sku, offerToken }],
            });
          } else {
            // Fallback if no offer details available
            purchase = await IAP.requestSubscription({ sku });
          }
        } else {
          // iOS uses StoreKit 2 — sku-based API works fine
          purchase = await IAP.requestSubscription({ sku });
        }
      } else {
        // Handle One-time Purchase (tokens)
        purchase = await IAP.requestPurchase({ sku });
      }

      if (Array.isArray(purchase)) purchase = purchase[0];

      if (purchase) {
        // Verify with backend
        return await this.verifyPurchase(purchase, userId);
      }
      return { success: false, error: 'Purchase cancelled' };
    } catch (err: any) {
      console.error('[Billing] Purchase error:', err);
      return { success: false, error: err.message };
    }
  },

  // Verify purchase with Appwrite backend
  async verifyPurchase(purchase: any, userId: string) {
    try {
      const payload: any = {
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

      // Execute stripe-checkout function (which now handles native verification)
      const execution = await functions.createExecution(
        'stripe-checkout',
        JSON.stringify(payload),
        false, '/', ExecutionMethod.POST
      );

      const result = JSON.parse(execution.responseBody);
      
      if (result.success) {
        // Finalize purchase in native store
        if (Platform.OS === 'ios') {
          await IAP.finishTransaction({ purchase, isConsumable: !purchase.productId.includes('pro_') });
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

  // Restore purchases
  async restorePurchases(userId: string) {
    try {
      const purchases = await IAP.getAvailablePurchases();
      if (purchases && purchases.length > 0) {
        let successCount = 0;
        for (const purchase of purchases) {
          const result = await this.verifyPurchase(purchase, userId);
          if (result.success) successCount++;
        }
        return { success: successCount > 0, count: successCount };
      }
      return { success: false, error: 'No purchases found to restore.' };
    } catch (err: any) {
      console.error('[Billing] Restore error:', err);
      return { success: false, error: err.message };
    }
  },

  // End connection
  async end() {
    await IAP.endConnection();
  }
};
