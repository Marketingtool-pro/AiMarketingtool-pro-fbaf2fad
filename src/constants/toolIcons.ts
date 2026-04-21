import { Platform } from 'react-native';

/**
 * PRO Tool Icon Mapping
 * High-performance mapping for 128+ MarketingTool categories and slugs.
 * Points EXCLUSIVELY to the optimized tool-icons-v2 set.
 */

export const ToolIconImages: Record<string, any> = {
  '1--nft': require('../assets/images/tool-icons-v2/1--nft.png'),
  '1-data-analytic': require('../assets/images/tool-icons-v2/1-data-analytic.png'),
  '1-online-store': require('../assets/images/tool-icons-v2/1-online-store.png'),
  '1-seo': require('../assets/images/tool-icons-v2/1-seo.png'),
  '1-technology': require('../assets/images/tool-icons-v2/1-technology.png'),
  '1-web-report': require('../assets/images/tool-icons-v2/1-web-report.png'),
  '10--digital-artist-female': require('../assets/images/tool-icons-v2/10--digital-artist-female.png'),
  '10-copywriter': require('../assets/images/tool-icons-v2/10-copywriter.png'),
  '10-link-building': require('../assets/images/tool-icons-v2/10-link-building.png'),
  '10-marketing-target': require('../assets/images/tool-icons-v2/10-marketing-target.png'),
  '11-analytics': require('../assets/images/tool-icons-v2/11-analytics.png'),
  '12-mobile-ads': require('../assets/images/tool-icons-v2/12-mobile-ads.png'),
  '13-social-media-engagement': require('../assets/images/tool-icons-v2/13-social-media-engagement.png'),
  '14-feedback': require('../assets/images/tool-icons-v2/14-feedback.png'),
  '15-content-marketing': require('../assets/images/tool-icons-v2/15-content-marketing.png'),
  '16-keyword-research': require('../assets/images/tool-icons-v2/16-keyword-research.png'),
  '17-backlink': require('../assets/images/tool-icons-v2/17-backlink.png'),
  '18-market-analysis': require('../assets/images/tool-icons-v2/18-market-analysis.png'),
  '19-marketing-strategy': require('../assets/images/tool-icons-v2/19-marketing-strategy.png'),
  '2-email-marketing': require('../assets/images/tool-icons-v2/2-email-marketing.png'),
  '20-ab-testing': require('../assets/images/tool-icons-v2/20-ab-testing.png'),
  '21-landing-page': require('../assets/images/tool-icons-v2/21-landing-page.png'),
  '22-mobile-optimization': require('../assets/images/tool-icons-v2/22-mobile-optimization.png'),
  '3-presentation': require('../assets/images/tool-icons-v2/3-presentation.png'),
  '4-promotion': require('../assets/images/tool-icons-v2/4-promotion.png'),
  '5-internet-security': require('../assets/images/tool-icons-v2/5-internet-security.png'),
  '6-marketing-strategy': require('../assets/images/tool-icons-v2/6-marketing-strategy.png'),
  '7-hashtag': require('../assets/images/tool-icons-v2/7-hashtag.png'),
  '8-optimized-content': require('../assets/images/tool-icons-v2/8-optimized-content.png'),
  '9-algorithm': require('../assets/images/tool-icons-v2/9-algorithm.png'),
  '9-analytics': require('../assets/images/tool-icons-v2/9-analytics.png'),
  'apple': require('../assets/images/tool-icons-v2/apple.png'),
  'brain-chip': require('../assets/images/tool-icons-v2/brain-chip.png'),
  'chat': require('../assets/images/tool-icons-v2/chat.png'),
  'google-ads': require('../assets/images/tool-icons-v2/google-ads.png'),
  'instagram': require('../assets/images/tool-icons-v2/instagram.png'),
  'meta': require('../assets/images/tool-icons-v2/meta.png'),
  'tiktok': require('../assets/images/tool-icons-v2/tiktok.png'),
  'whatsapp': require('../assets/images/tool-icons-v2/whatsapp.png'),
  'x-twitter': require('../assets/images/tool-icons-v2/x-twitter.png'),
  'youtube': require('../assets/images/tool-icons-v2/youtube.png'),
};

const DEFAULT_ICON = require('../assets/images/tool-icons-v2/6-marketing-strategy.png');

export const ToolIconImagesKeys = Object.keys(ToolIconImages);

const slugIconOverride: Record<string, any> = {};
export function setToolIconOverride(slug: string, icon: any) {
  slugIconOverride[slug] = icon;
}

export function getToolIcon(slug: string, category?: string): any {
  if (slugIconOverride[slug]) return slugIconOverride[slug];
  
  // Clean slug match
  const cleanSlug = slug.toLowerCase().trim();
  if (ToolIconImages[cleanSlug]) return ToolIconImages[cleanSlug];
  
  // Category fallback
  if (category && ToolIconImages[category.toLowerCase().trim()]) {
    return ToolIconImages[category.toLowerCase().trim()];
  }

  // Deterministic hash fallback from existing keys
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  const keys = Object.keys(ToolIconImages);
  return ToolIconImages[keys[h % keys.length]] || DEFAULT_ICON;
}
