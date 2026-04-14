// 314 tools → Premium 3D icons from your 23 paid folders
// Optimized 128x128 PNGs for zero-crash performance

const ToolIconImages: Record<string, any> = {
  // ADS & MARKETING
  'facebook-ad-copy': require('../assets/images/social-icons/01_Facebook.png'),
  'instagram-caption': require('../assets/images/social-icons/02_Instagram.png'),
  'google-ads-headline': require('../assets/images/tool-icons-v2/google-3d.png'),
  'meta-creative-studio': require('../assets/images/tool-icons-v2/meta-3d.png'),
  'ad-intelligence-software': require('../assets/images/tool-icons-v2/marketing-strategy-3d.png'),
  'ads-launcher': require('../assets/images/tool-icons-v2/onboarding-3.png'),
  'pay-per-click': require('../assets/images/tool-icons-v2/20.-pay-per-click.png'),
  'email-campaign': require('../assets/images/tool-icons-v2/2.-email-campaign.png'),
  
  // SEO & CONTENT
  'google-seo-optimizer': require('../assets/images/tool-icons-v2/seo-3d.png'),
  'keyword-research': require('../assets/images/tool-icons-v2/4.-keyword-researchb.png'),
  'analytics-pro': require('../assets/images/tool-icons-v2/analytics-3d.png'),
  'blog-content-generator': require('../assets/images/tool-icons-v2/icon-15.png'),
  'sitemap-generator': require('../assets/images/tool-icons-v2/15-sitemap.png'),
  'link-building': require('../assets/images/tool-icons-v2/19.-link-building.png'),
  
  // E-COMMERCE
  'shopify-product-desc': require('../assets/images/tool-icons-v2/shopify-3d.png'),
  'ecommerce-optimization': require('../assets/images/tool-icons-v2/ecommerce-3d.png'),
  'product-trolley': require('../assets/images/tool-icons-v2/3.-trolley.png'),
  'sales-funnel': require('../assets/images/tool-icons-v2/17.-funelling.png'),
  
  // AI & TECH
  'ai-robot-assistant': require('../assets/images/tool-icons-v2/ai-3d.png'),
  'ai-brain-chip': require('../assets/images/tool-icons-v2/brain-chip.png'),
  'automation-testing': require('../assets/images/tool-icons-v2/automation-testing.png'),
  'binary-code': require('../assets/images/tool-icons-v2/14-binary-code.png'),
  'saas-platform': require('../assets/images/tool-icons-v2/saas-platform.png'),
  
  // BUSINESS
  'business-growth': require('../assets/images/tool-icons-v2/business-growth.png'),
  'business-profit': require('../assets/images/tool-icons-v2/business-profit.png'),
  'rocket-launch': require('../assets/images/tool-icons-v2/rocket.png'),
  'trophy-achievement': require('../assets/images/tool-icons-v2/trophy.png'),
  
  // PLATFORM & UI OVERRIDES
  'code': require('../assets/images/tool-icons-v2/automation-3d.png'),
  'developer': require('../assets/images/tool-icons-v2/14-binary-code.png'),
  'automation': require('../assets/images/tool-icons-v2/automation-testing.png'),
};

const DEFAULT_ICON = require('../assets/images/tool-icons-v2/marketing-strategy-3d.png');

const _iconCache = new Map<string, any>();

export function getToolIcon(slug: string, category?: string): any {
  const cached = _iconCache.get(slug);
  if (cached) return cached;
  
  // Dynamic matching for 314 tools based on keywords if not explicitly mapped
  let result = ToolIconImages[slug];
  
  if (!result) {
    if (slug.includes('facebook') || slug.includes('meta')) result = require('../assets/images/social-icons/01_Facebook.png');
    else if (slug.includes('instagram')) result = require('../assets/images/social-icons/02_Instagram.png');
    else if (slug.includes('google')) result = require('../assets/images/tool-icons-v2/google-3d.png');
    else if (slug.includes('seo')) result = require('../assets/images/tool-icons-v2/seo-3d.png');
    else if (slug.includes('analytics')) result = require('../assets/images/tool-icons-v2/analytics-3d.png');
    else if (slug.includes('email')) result = require('../assets/images/tool-icons-v2/2.-email-campaign.png');
    else if (slug.includes('shopify') || slug.includes('shop')) result = require('../assets/images/tool-icons-v2/shopify-3d.png');
    else if (slug.includes('ai') || slug.includes('bot')) result = require('../assets/images/tool-icons-v2/ai-3d.png');
    else if (slug.includes('code') || slug.includes('api')) result = require('../assets/images/tool-icons-v2/14-binary-code.png');
    else result = DEFAULT_ICON;
  }

  _iconCache.set(slug, result);
  return result;
}

export default ToolIconImages;
