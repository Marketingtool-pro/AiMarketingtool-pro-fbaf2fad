import type { LinkingOptions } from '@react-navigation/native';
import type { RootStackParamList } from './AppNavigator';

// Which marketingtool.pro URLs open a screen in this app.
//
// Everything not listed here (blog, resources, solutions, about, audit-report,
// release-notes) has no in-app equivalent and is deliberately left in the
// browser -- a URL that opens the app on an unrelated screen is worse than one
// that stays on the web.
//
// This list and android.intentFilters in app.json must stay in step: a path
// declared there but missing here opens the app on its default screen instead
// of the page the user tapped. scripts/deeplinks.test.mjs fails if they drift.
//
// The marketingtool:// scheme is absent on purpose. OAuth callbacks arrive on
// it and are handled by completeOAuthFromUrl in App.tsx; letting the navigator
// also claim them would race that handler.
export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [
    'https://marketingtool.pro',
    'https://www.marketingtool.pro',
    'https://app.marketingtool.pro',
  ],
  config: {
    screens: {
      Main: {
        screens: {
          Dashboard: '',
          // /tools/<category> are marketing category pages ("seo",
          // "ppc-optimization"); those slugs are not app tool slugs, so they
          // land on the tool list. Routing them to ToolDetail would hang:
          // it renders a spinner until tools.find(t => t.slug === toolSlug)
          // matches, which for a category slug never happens.
          Tools: 'tools/:category?',
        },
      },
      Subscription: 'pricing',
      Privacy: 'privacy-policy',
      Terms: 'terms-policy',
      Contact: 'contact',
    },
  },
};
