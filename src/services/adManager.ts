import mobileAds, {
  MaxAdContentRating,
  InterstitialAd,
  GAMInterstitialAd,
  AdEventType,
} from 'react-native-google-mobile-ads';
import { AdUnits, AdProvider } from '../config/ads';

/**
 * AdManager — central controller for BOTH ad products (AdMob + Ad Manager).
 *
 * Responsibilities:
 *   • Initialize the Google Mobile Ads SDK once at app start (the SDK is shared
 *     by both products, so one initialize() covers AdMob and Ad Manager).
 *   • Own the interstitial lifecycle (preload → show → auto-reload) for each
 *     provider independently.
 *
 * Banner ads render declaratively via <AdBanner provider="admob|gam" /> and
 * aren't driven from here. Singleton — matches the matomo / billingService
 * pattern so interstitials are preloaded once and reused across screens.
 */

/** One self-reloading interstitial slot for a single provider. */
class InterstitialSlot {
  private ad: InterstitialAd | GAMInterstitialAd | null = null;
  private loaded = false;
  private unsubscribers: Array<() => void> = [];

  constructor(private readonly provider: AdProvider) {}

  preload(): void {
    this.teardown();

    const unitId = AdUnits[this.provider].interstitial;
    // GAMInterstitialAd is Ad Manager; InterstitialAd is AdMob. Same API surface.
    const ad =
      this.provider === 'gam'
        ? GAMInterstitialAd.createForAdRequest(unitId)
        : InterstitialAd.createForAdRequest(unitId, {
            requestNonPersonalizedAdsOnly: false,
          });
    this.ad = ad;
    this.loaded = false;

    this.unsubscribers.push(
      ad.addAdEventListener(AdEventType.LOADED, () => {
        this.loaded = true;
      }),
      ad.addAdEventListener(AdEventType.CLOSED, () => {
        this.preload(); // reload for next time once dismissed
      }),
      ad.addAdEventListener(AdEventType.ERROR, (err) => {
        this.loaded = false;
        if (__DEV__) console.warn(`[AdManager:${this.provider}] interstitial error:`, err);
      }),
    );

    ad.load();
  }

  show(): boolean {
    if (this.ad && this.loaded) {
      this.ad.show();
      this.loaded = false;
      return true;
    }
    if (!this.ad) this.preload();
    return false;
  }

  get isReady(): boolean {
    return this.loaded;
  }

  private teardown(): void {
    this.unsubscribers.forEach((u) => u());
    this.unsubscribers = [];
    this.ad = null;
    this.loaded = false;
  }
}

class AdManager {
  private initialized = false;
  private interstitials: Record<AdProvider, InterstitialSlot> = {
    admob: new InterstitialSlot('admob'),
    gam: new InterstitialSlot('gam'),
  };

  /**
   * Initialize the shared SDK. Safe to call repeatedly — only the first runs.
   * Call AFTER first paint (see App.tsx deferredInit) so SDK network calls
   * never block cold start / cause an ANR.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    try {
      await mobileAds().setRequestConfiguration({
        maxAdContentRating: MaxAdContentRating.PG,
        tagForChildDirectedTreatment: false,
        tagForUnderAgeOfConsent: false,
        testDeviceIdentifiers: ['EMULATOR'],
      });

      await mobileAds().initialize();

      // Preload an interstitial for each provider.
      this.interstitials.admob.preload();
      this.interstitials.gam.preload();
    } catch (e) {
      this.initialized = false;
      if (__DEV__) console.warn('[AdManager] initialize error:', e);
    }
  }

  /**
   * Show a preloaded interstitial from the chosen provider.
   * @returns true if an ad was shown, false if none was ready.
   */
  showInterstitial(provider: AdProvider = 'admob'): boolean {
    return this.interstitials[provider].show();
  }

  /** Whether an interstitial for the given provider is ready right now. */
  isInterstitialReady(provider: AdProvider = 'admob'): boolean {
    return this.interstitials[provider].isReady;
  }
}

export const adManager = new AdManager();
