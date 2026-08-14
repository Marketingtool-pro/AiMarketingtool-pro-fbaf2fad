# Play Store listing — differences from the App Store listing

Pulled from the two live public listings on 14 Aug 2026.

Apple: `apps.apple.com/app/id6758618412` · Google: `play.google.com/store/apps/details?id=pro.marketingtool.app`

| Field | Apple App Store | Google Play | Match |
|---|---|---|---|
| Name / Title | `MarketingTool - AI Marketing` | `MarketingTool` | **no** |
| Subtitle / Short description | `AI Ads, Copy & Content Writer` | `AI marketing automation with 206+ tools for content, ads, SEO & analytics` | **no** |
| Category | Business | Business | yes |
| Version | 1.5.11 | 1.5.11 | yes |
| Long description | 206+ tools, sectioned by Google Ads & SEO / Facebook & Instagram / Shopify / Email / MarketBot | different copy, bullet list | **no** |

## Change these two fields in Play Console

Play Console → **Grow users → Store presence → Main store listing**

**App name** — Play limit 30 characters

    MarketingTool - AI Marketing

28 characters. Fits, and matches Apple exactly.

**Short description** — Play limit 80 characters

    AI Ads, Copy & Content Writer

29 characters. Matches Apple's subtitle exactly.

Both Apple values fit inside Play's limits, so parity is achievable without shortening anything.

## Long description

Apple's is the stronger copy: it opens with the value proposition, then breaks
into labelled sections. Play's is a flat bullet list that starts mid-sentence
("campaigns 24/7") — the opening line appears to have been truncated at some
point.

Recommended: paste Apple's description into Play verbatim. Play allows 4000
characters, which is more than Apple's 4000-character limit uses, so it fits.
Keep the section headings; they render as plain text on both stores.

Apple's opening, for reference:

> MarketingTool is your AI-powered marketing assistant — generate professional
> ad copy, social media captions, email campaigns, product descriptions, and
> more in seconds. Whether you're a solo entrepreneur, freelancer, agency, or
> e-commerce seller, MarketingTool gives you access to 206+ AI-powered tools
> designed to save hours of writing and boost your marketing results.

## Keywords

Apple keyword field (100 chars, 97 used):

    ai marketing, ad copy, copywriting, content writer, social media,
    instagram captions, seo, email, shopify

Play has no keyword field — ranking comes from the title, short description and
long description. To carry the same terms across, make sure `copywriting`,
`content writer`, `instagram captions`, `seo`, `shopify` and `ad copy` all
appear naturally in the Play long description. Using Apple's description text
covers most of them already.

## Not a listing issue, but blocks the next submission

The privacy policy at marketingtool.pro/privacy-policy/ does not disclose
advertising ID, phone number, camera/photos, biometrics or the push token —
all of which the app collects. See `docs/mobile-privacy-addendum.md`. Play
enforces the advertising-ID disclosure automatically.
