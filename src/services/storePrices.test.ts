import { test, expect, describe } from 'bun:test';
import { extractStorePrices, yearlySavingPercent, type AndroidSubMap } from './storePrices';

const ANDROID_MAP: AndroidSubMap = {
  'pro.marketingtool.growth.monthly': { product: 'growth', basePlan: 'monthly' },
  'pro.marketingtool.growth.yearly': { product: 'growth', basePlan: 'yearly' },
};

const phase = (formattedPrice: string, micros: number, currency: string) => ({
  billingCycleCount: 0,
  billingPeriod: 'P1M',
  formattedPrice,
  priceAmountMicros: String(micros),
  priceCurrencyCode: currency,
  recurrenceMode: 1,
});

describe('extractStorePrices', () => {
  test('reads iOS products by sku from displayPrice and price', () => {
    const prices = extractStorePrices(
      [{ id: 'pro.marketingtool.pro.yearly', displayPrice: '€549,99', price: 549.99, currency: 'EUR' }],
      'ios',
      ANDROID_MAP,
    );
    expect(prices['pro.marketingtool.pro.yearly']).toEqual({ display: '€549,99', amount: 549.99, currency: 'EUR' });
  });

  test('maps Android base plans to the iOS-style skus using the recurring phase', () => {
    const prices = extractStorePrices(
      [{
        id: 'growth',
        subscriptionOfferDetailsAndroid: [
          { basePlanId: 'monthly', offerToken: 'm', pricingPhases: { pricingPhaseList: [phase('₹10,900.00', 10_900_000_000, 'INR')] } },
          // Free-trial offer on the yearly plan: the base plan (no offerId) must win.
          { basePlanId: 'yearly', offerId: 'trial', offerToken: 't', pricingPhases: { pricingPhaseList: [phase('Free', 0, 'INR'), phase('₹54,600.00', 54_600_000_000, 'INR')] } },
          { basePlanId: 'yearly', offerToken: 'y', pricingPhases: { pricingPhaseList: [phase('₹54,600.00', 54_600_000_000, 'INR')] } },
        ],
      }],
      'android',
      ANDROID_MAP,
    );
    expect(prices['pro.marketingtool.growth.monthly']).toEqual({ display: '₹10,900.00', amount: 10900, currency: 'INR' });
    expect(prices['pro.marketingtool.growth.yearly']).toEqual({ display: '₹54,600.00', amount: 54600, currency: 'INR' });
  });

  test('reads Android one-time products (tokens) by id', () => {
    const prices = extractStorePrices([{ id: 'tokens', displayPrice: '£2.99', price: 2.99, currency: 'GBP' }], 'android', ANDROID_MAP);
    expect(prices.tokens).toEqual({ display: '£2.99', amount: 2.99, currency: 'GBP' });
  });

  test('ignores malformed products instead of throwing', () => {
    expect(extractStorePrices([null, 42, { id: 'growth' }, { id: 'x', displayPrice: '' }], 'android', ANDROID_MAP)).toEqual({});
  });
});

describe('yearlySavingPercent', () => {
  test('computes the real saving from local prices', () => {
    const m = { display: '€104.99', amount: 104.99, currency: 'EUR' };
    const y = { display: '€549.99', amount: 549.99, currency: 'EUR' };
    expect(yearlySavingPercent(m, y)).toBe(56);
  });

  test('returns null when prices are missing, in different currencies, or not a saving', () => {
    const usd = { display: '$99.99', amount: 99.99, currency: 'USD' };
    expect(yearlySavingPercent(undefined, usd)).toBeNull();
    expect(yearlySavingPercent(usd, { display: '€1', amount: 1, currency: 'EUR' })).toBeNull();
    expect(yearlySavingPercent(usd, { display: '$1500', amount: 1500, currency: 'USD' })).toBeNull();
  });
});
