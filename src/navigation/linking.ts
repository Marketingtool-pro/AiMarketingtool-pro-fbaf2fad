import type { LinkingOptions } from '@react-navigation/native';
import type { RootStackParamList } from './AppNavigator';

// Site sections with no native screen. They open WebPageScreen, which shows
// the same marketingtool.pro page inside the app -- never an unrelated screen.
export const WEB_SECTIONS = [
  'about',
  'blog',
  'resources',
  'solutions',
  'release-notes',
  'audit-report',
] as const;

// Which marketingtool.pro URLs open a screen in this app.
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
      // Static routes above outrank this param route, so it only catches
      // paths nothing else claims; WebPageScreen loads WEB_SECTIONS only.
      WebPage: ':section/:slug?',
    },
  },
};
