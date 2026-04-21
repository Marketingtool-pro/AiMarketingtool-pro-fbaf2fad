import { Platform } from 'react-native';

/**
 * PRO Tool Icon Mapping
 * High-performance mapping for 128+ MarketingTool categories and slugs.
 * Points EXCLUSIVELY to verified, high-quality tool-icons-v2 assets.
 */

export const ToolIconImages: Record<string, any> = {
  // Social & Platforms
  'facebook': require('../assets/images/tool-icons-v2/facebook.png'),
  'instagram': require('../assets/images/tool-icons-v2/instagram.png'),
  'whatsapp': require('../assets/images/tool-icons-v2/whatsapp.png'),
  'x-twitter': require('../assets/images/tool-icons-v2/x-twitter.png'),
  'youtube': require('../assets/images/tool-icons-v2/youtube.png'),
  'apple': require('../assets/images/tool-icons-v2/apple.png'),
  'meta': require('../assets/images/tool-icons-v2/meta.png'),
  'tiktok': require('../assets/images/tool-icons-v2/tiktok.png'),
  'linkedin': require('../assets/images/tool-icons-v2/linkedin.png'),
  'reddit': require('../assets/images/tool-icons-v2/reddit.png'),
  'pinterest': require('../assets/images/tool-icons-v2/pinterest.png'),

  // Core Marketing & AI
  '1-seo': require('../assets/images/tool-icons-v2/1-seo.png'),
  '1-data-analytic': require('../assets/images/tool-icons-v2/1-data-analytic.png'),
  '1-online-store': require('../assets/images/tool-icons-v2/1-online-store.png'),
  '1-technology': require('../assets/images/tool-icons-v2/1-technology.png'),
  '1-web-report': require('../assets/images/tool-icons-v2/1-web-report.png'),
  '2-email-marketing': require('../assets/images/tool-icons-v2/2-email-marketing.png'),
  '2-smartphone': require('../assets/images/tool-icons-v2/2-smartphone.png'),
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
  '13-social-media-engagement': require('../assets/images/tool-icons-v2/13-social-media-engagement.png'),
  '14-feedback': require('../assets/images/tool-icons-v2/14-feedback.png'),
  '15-content-marketing': require('../assets/images/tool-icons-v2/15-content-marketing.png'),
  '16-keyword-research': require('../assets/images/tool-icons-v2/16-keyword-research.png'),
  '17-backlink': require('../assets/images/tool-icons-v2/17-backlink.png'),
  '18-market-analysis': require('../assets/images/tool-icons-v2/18-market-analysis.png'),
  '19-optimization': require('../assets/images/tool-icons-v2/19-optimization.png'),
  '20-ab-testing': require('../assets/images/tool-icons-v2/20-ab-testing.png'),
  '21-landing-page': require('../assets/images/tool-icons-v2/21-landing-page.png'),
  '22-mobile-optimization': require('../assets/images/tool-icons-v2/22-mobile-optimization.png'),

  // UI Components & Icons
  'chat': require('../assets/images/tool-icons-v2/chat.png'),
  'brain-chip': require('../assets/images/tool-icons-v2/brain-chip.png'),
  'ai-3d': require('../assets/images/tool-icons-v2/ai-3d.png'),
  'analytics-3d': require('../assets/images/tool-icons-v2/analytics-3d.png'),
  'automation': require('../assets/images/tool-icons-v2/automation.png'),
  'billing': require('../assets/images/tool-icons-v2/billing.png'),
  'bot': require('../assets/images/tool-icons-v2/bot.png'),
  'browser': require('../assets/images/tool-icons-v2/browser.png'),
  'calendar': require('../assets/images/tool-icons-v2/calendar.png'),
  'camera': require('../assets/images/tool-icons-v2/camera.png'),
  'checkout': require('../assets/images/tool-icons-v2/checkout.png'),
  'clock': require('../assets/images/tool-icons-v2/clock.png'),
  'contact': require('../assets/images/tool-icons-v2/contact.png'),
  'dashboard': require('../assets/images/tool-icons-v2/dashboard.png'),
  'database': require('../assets/images/tool-icons-v2/database.png'),
  'folder': require('../assets/images/tool-icons-v2/folder.png'),
  'image': require('../assets/images/tool-icons-v2/image.png'),
  'note': require('../assets/images/tool-icons-v2/note.png'),
  'package': require('../assets/images/tool-icons-v2/package.png'),
  'padlock': require('../assets/images/tool-icons-v2/padlock.png'),
  'payment': require('../assets/images/tool-icons-v2/payment.png'),
  'pencil': require('../assets/images/tool-icons-v2/pencil.png'),
  'phone': require('../assets/images/tool-icons-v2/phone.png'),
  'rating': require('../assets/images/tool-icons-v2/rating.png'),
  'robot': require('../assets/images/tool-icons-v2/robot.png'),
  'safe': require('../assets/images/tool-icons-v2/safe.png'),
  'setting': require('../assets/images/tool-icons-v2/setting.png'),
  'shield': require('../assets/images/tool-icons-v2/shield.png'),
  'star': require('../assets/images/tool-icons-v2/star.png'),
  'subscription': require('../assets/images/tool-icons-v2/subscription.png'),
  'trophy': require('../assets/images/tool-icons-v2/trophy.png'),
  'user': require('../assets/images/tool-icons-v2/user.png'),
  'wrench': require('../assets/images/tool-icons-v2/wrench.png'),
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

  // Deterministic fallback using hash
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return ToolIconImages[ToolIconImagesKeys[h % ToolIconImagesKeys.length]] || DEFAULT_ICON;
}
