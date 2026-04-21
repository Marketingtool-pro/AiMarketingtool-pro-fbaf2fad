import { Platform } from 'react-native';

/**
 * PRO Tool Icon Mapping
 * High-performance mapping for MarketingTool.
 * Points EXCLUSIVELY to verified, existing tool-icons-v2 assets.
 */

export const ToolIconImages: Record<string, any> = {
  // Social & Platforms (Verified Exist)
  'facebook': require('../assets/images/tool-icons-v2/facebook.png'),
  'instagram': require('../assets/images/tool-icons-v2/instagram.png'),
  'whatsapp': require('../assets/images/tool-icons-v2/whatsapp.png'),
  'x-twitter': require('../assets/images/tool-icons-v2/x-twitter.png'),
  'youtube': require('../assets/images/tool-icons-v2/youtube.png'),
  'meta': require('../assets/images/tool-icons-v2/meta.png'),
  'tiktok': require('../assets/images/tool-icons-v2/tiktok.png'),
  'linkedin': require('../assets/images/tool-icons-v2/linkedin.png'),
  'reddit': require('../assets/images/tool-icons-v2/reddit.png'),
  'pinterest': require('../assets/images/tool-icons-v2/pinterest.png'),

  // AI & Tech (Verified Exist)
  'brain-chip': require('../assets/images/tool-icons-v2/brain-chip.png'),
  'ai-3d': require('../assets/images/tool-icons-v2/ai-3d.png'),
  'analytics-3d': require('../assets/images/tool-icons-v2/analytics-3d.png'),
  'automation': require('../assets/images/tool-icons-v2/automation.png'),
  'robot': require('../assets/images/tool-icons-v2/robot.png'),
  'saas-platform': require('../assets/images/tool-icons-v2/saas-platform.png'),

  // UI & Business (Verified Exist)
  'chat': require('../assets/images/tool-icons-v2/chat.png'),
  'billing': require('../assets/images/tool-icons-v2/billing.png'),
  'dashboard': require('../assets/images/tool-icons-v2/dashboard.png'),
  'database': require('../assets/images/tool-icons-v2/database.png'),
  'setting': require('../assets/images/tool-icons-v2/setting.png'),
  'subscription': require('../assets/images/tool-icons-v2/subscription.png'),
  'user': require('../assets/images/tool-icons-v2/user.png'),

  // Numbered Marketing Icons (Verified Exist)
  '1-seo': require('../assets/images/tool-icons-v2/1-seo.png'),
  '1-data-analytic': require('../assets/images/tool-icons-v2/1-data-analytic.png'),
  '2-email-marketing': require('../assets/images/tool-icons-v2/2-email-marketing.png'),
  '3-presentation': require('../assets/images/tool-icons-v2/3-presentation.png'),
  '4-promotion': require('../assets/images/tool-icons-v2/4-promotion.png'),
  '5-internet-security': require('../assets/images/tool-icons-v2/5-internet-security.png'),
  '6-marketing-strategy': require('../assets/images/tool-icons-v2/6-marketing-strategy.png'),
  '7-hashtag': require('../assets/images/tool-icons-v2/7-hashtag.png'),
  '8-optimized-content': require('../assets/images/tool-icons-v2/8-optimized-content.png'),
  '9-algorithm': require('../assets/images/tool-icons-v2/9-algorithm.png'),
  '10-copywriter': require('../assets/images/tool-icons-v2/10-copywriter.png'),
  '11-analytics': require('../assets/images/tool-icons-v2/11-analytics.png'),
  '12-mobile-ads': require('../assets/images/tool-icons-v2/12-mobile-ads.png'),
};

const DEFAULT_ICON = require('../assets/images/tool-icons-v2/6-marketing-strategy.png');

export const ToolIconImagesKeys = Object.keys(ToolIconImages);

const slugIconOverride: Record<string, any> = {};
export function setToolIconOverride(slug: string, icon: any) {
  slugIconOverride[slug] = icon;
}

export function getToolIcon(slug: string, category?: string): any {
  if (slugIconOverride[slug]) return slugIconOverride[slug];
  
  const cleanSlug = slug.toLowerCase().trim();
  if (ToolIconImages[cleanSlug]) return ToolIconImages[cleanSlug];
  
  if (category) {
    const cleanCategory = category.toLowerCase().trim();
    if (ToolIconImages[cleanCategory]) return ToolIconImages[cleanCategory];
  }

  // Hash-based deterministic fallback to ensure every tool gets a valid verified icon
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  const key = ToolIconImagesKeys[h % ToolIconImagesKeys.length];
  return ToolIconImages[key] || DEFAULT_ICON;
}
