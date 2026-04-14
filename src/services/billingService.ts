import { Platform } from 'react-native';
import * as IAP from 'react-native-iap';
import { functions } from './appwrite';
import { ExecutionMethod } from 'react-native-appwrite';

// Native Product IDs (matching App Store & Google Play)
const productSkus = Platform.select({
  ios: [
    'pro_starter_monthly',
    'pro_starter_yearly',
    'pro_professional_monthly',
    'pro_professional_yearly',
    'pro_growth_monthly',
    'pro_growth_yearly',
    'tokens_100',
  ],
  android: [
    'pro_starter_monthly',
    'pro_starter_yearly',
    'pro_professional_monthly',
    'pro_professional_yearly',
    'pro_growth_monthly',
    'pro_growth_yearly',
    'tokens_100',
  ],
}) || [];

export const billingService = {
  // Initialize connection to store
  async initialize() {
    try {
      await IAP.initConnection();
      if (Platform.OS === 'android') {
        await IAP.flushFailedPurchasesCachedAsPendingAndroid();
      }
      return true;
    } catch (err) {
      console.error('[Billing] Init error:', err);
      return false;
    }
  },

  // Fetch products from store
  async getProducts() {
    try {
      const products = await IAP.getProducts({ skus: productSkus });
      const subscriptions = await IAP.getSubscriptions({ skus: productSkus });
      return [...products, ...subscriptions];
    } catch (err) {
      console.error('[Billing] Fetch products error:', err);
      return [];
    }
  },

  // Start purchase flow
  async requestPurchase(sku: string, userId: string) {
    try {
      let purchase;
      if (sku.includes('monthly') || sku.includes('yearly')) {
        // Handle Subscription
        purchase = await IAP.requestSubscription({ sku });
      } else {
        // Handle One-time Purchase
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
  async verifyPurchase(purchase: IAP.Purchase, userId: string) {
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
