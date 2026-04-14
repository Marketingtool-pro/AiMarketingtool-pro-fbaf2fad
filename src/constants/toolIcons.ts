// 314 tools → Premium 3D icons from your 23 paid folders
// Optimized 128x128 PNGs for zero-crash performance

const ToolIconImages: Record<string, any> = {
  // ADS & MARKETING
  'facebook-ad-copy': require('../assets/images/social-icons/01_facebook.png'),
  'instagram-caption': require('../assets/images/social-icons/02_instagram.png'),
  'google-ads-headline': require('../assets/images/tool-icons-v2/google-3d.png'),
  'meta-creative-studio': require('../assets/images/tool-icons-v2/meta-3d.png'),
  'pay-per-click': require('../assets/images/tool-icons-v2/pay-per-click.png'),
  'email-campaign': require('../assets/images/tool-icons-v2/email-notification.png'),
  
  // SEO & CONTENT
  'google-seo-optimizer': require('../assets/images/tool-icons-v2/seo-3d.png'),
  'keyword-research': require('../assets/images/tool-icons-v2/keyword.png'),
  'analytics-pro': require('../assets/images/tool-icons-v2/analytics-3d.png'),
  'blog-content-generator': require('../assets/images/tool-icons-v2/copywriting.png'),
  'sitemap-generator': require('../assets/images/tool-icons-v2/sitemap.png'),
  'link-building': require('../assets/images/tool-icons-v2/link-building.png'),
  
  // E-COMMERCE
  'shopify-product-desc': require('../assets/images/tool-icons-v2/shopify-3d.png'),
  'ecommerce-optimization': require('../assets/images/tool-icons-v2/ecommerce-3d.png'),
  'product-trolley': require('../assets/images/tool-icons-v2/product-trolley.png'),
  'sales-funnel': require('../assets/images/tool-icons-v2/conversion-rate.png'),
  
  // AI & TECH
  'ai-robot-assistant': require('../assets/images/tool-icons-v2/ai-3d.png'),
  'ai-brain-chip': require('../assets/images/tool-icons-v2/ai-brain.png'),
  'automation-testing': require('../assets/images/tool-icons-v2/automation-testing.png'),
  'saas-platform': require('../assets/images/tool-icons-v2/saas-platform.png'),
  
  // BUSINESS
  'business-growth': require('../assets/images/tool-icons-v2/business-growth.png'),
  'business-profit': require('../assets/images/tool-icons-v2/business-profit.png'),
  'rocket-launch': require('../assets/images/tool-icons-v2/rocket.png'),
  'trophy-achievement': require('../assets/images/tool-icons-v2/trophy.png'),
  
  // PLATFORM & UI OVERRIDES
  'code': require('../assets/images/tool-icons-v2/automation-testing.png'),
  'developer': require('../assets/images/tool-icons-v2/ai-proggamming.png'),
  'automation': require('../assets/images/tool-icons-v2/automation.png'),
};

const DEFAULT_ICON = require('../assets/images/tool-icons-v2/marketing-strategy.png');

const _iconCache = new Map<string, any>();

export function getToolIcon(slug: string, category?: string): any {
  const cached = _iconCache.get(slug);
  if (cached) return cached;
  
  let result = ToolIconImages[slug];
  
  if (!result) {
    const s = slug.toLowerCase();
    if (s.includes('facebook') || s.includes('meta')) result = require('../assets/images/social-icons/01_facebook.png');
    else if (s.includes('instagram')) result = require('../assets/images/social-icons/02_instagram.png');
    else if (s.includes('google')) result = require('../assets/images/tool-icons-v2/google-3d.png');
    else if (s.includes('seo')) result = require('../assets/images/tool-icons-v2/seo-3d.png');
    else if (s.includes('analytics')) result = require('../assets/images/tool-icons-v2/analytics-3d.png');
    else if (s.includes('email')) result = require('../assets/images/tool-icons-v2/email-notification.png');
    else if (s.includes('shopify') || s.includes('shop') || s.includes('product')) result = require('../assets/images/tool-icons-v2/shopify-3d.png');
    else if (s.includes('ai') || s.includes('bot') || s.includes('intelligence')) result = require('../assets/images/tool-icons-v2/ai-3d.png');
    else if (s.includes('code') || s.includes('api') || s.includes('dev')) result = require('../assets/images/tool-icons-v2/ai-proggamming.png');
    else result = DEFAULT_ICON;
  }

  _iconCache.set(slug, result);
  return result;
}

export default ToolIconImages;
