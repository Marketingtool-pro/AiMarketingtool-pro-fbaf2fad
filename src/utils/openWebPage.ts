// Open a marketingtool.pro page (Help, Contact, Tutorials, Terms, Privacy,
// Pricing) so it actually shows the page on Android.
//
// Why this exists: Android sent these taps back INTO the app instead of the
// website. app.json declared an autoVerify App Links filter claiming every path
// on marketingtool.pro / www.marketingtool.pro, and assetlinks.json on both
// hosts verifies it. The app handles no web routes (App.tsx only reads OAuth
// callbacks), so any Linking.openURL of a site URL was delivered to the app,
// ignored, and the user stayed where they were -- "the support pages do not
// connect". b8ffbf4bad removed that filter on 2026-07-14; 30b500dc60 put it
// back on 2026-08-26 to satisfy Play's deep-links report.
//
// Two layers, both needed:
//  1. app.json no longer claims the marketing site (removes the capture).
//  2. Every site link goes through the in-app browser (Custom Tabs /
//     SFSafariViewController), which opens the URL in the browser directly and
//     never asks the OS which app handles it. Linking.openURL is only the
//     fallback for devices with no Custom Tabs browser
//     (ERR_NO_MATCHING_ACTIVITY), and is safe now that nothing claims the URL.
import { Linking } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

export async function openWebPage(url: string): Promise<void> {
  try {
    await WebBrowser.openBrowserAsync(url);
  } catch {
    try {
      await Linking.openURL(url);
    } catch {
      // Nothing on the device can open a URL; there is no further fallback.
    }
  }
}
