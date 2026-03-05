// 3D Tool Icons - mapped by category/badge and tool slug
const ToolIconImages = {
  // Social platforms
  'facebook': require('../assets/images/tool-icons/facebook-3d.png'),
  'instagram': require('../assets/images/tool-icons/instagram-3d.png'),
  'meta': require('../assets/images/tool-icons/meta-3d.png'),
  'youtube': require('../assets/images/tool-icons/youtube-3d.png'),
  'linkedin': require('../assets/images/tool-icons/linkedin-3d.png'),
  'x-twitter': require('../assets/images/tool-icons/x-3d.png'),
  'tiktok': require('../assets/images/tool-icons/tiktok-3d.png'),
  'pinterest': require('../assets/images/tool-icons/pinterest-3d.png'),
  'reddit': require('../assets/images/tool-icons/reddit-3d.png'),
  'snapchat': require('../assets/images/tool-icons/snapchat-3d.png'),
  'telegram': require('../assets/images/tool-icons/telegram-3d.png'),
  'whatsapp': require('../assets/images/tool-icons/whatsapp-3d.png'),
  'medium': require('../assets/images/tool-icons/medium-3d.png'),
  'messenger': require('../assets/images/tool-icons/messenger-3d.png'),

  // Ads & campaigns
  'ads': require('../assets/images/tool-icons/ads-3d.png'),
  'ads-creator': require('../assets/images/tool-icons/ads-creator-3d.png'),
  'ads-character': require('../assets/images/tool-icons/ads-character-3d.png'),
  'advertisement': require('../assets/images/tool-icons/advertisement-3d.png'),
  'advertisement-premium': require('../assets/images/tool-icons/advertisement-premium-3d.png'),
  'online-ads': require('../assets/images/tool-icons/online-ads-3d.png'),
  'video-ads': require('../assets/images/tool-icons/video-ads-3d.png'),
  'campaign': require('../assets/images/tool-icons/campaign-3d.png'),
  'marketing-campaign': require('../assets/images/tool-icons/marketing-campaign-3d.png'),

  // Marketing & strategy
  'marketing-strategy': require('../assets/images/tool-icons/marketing-strategy-3d.png'),
  'marketing-strategy-premium': require('../assets/images/tool-icons/marketing-strategy-premium-3d.png'),
  'strategy': require('../assets/images/tool-icons/strategy-3d.png'),
  'marketing-budget': require('../assets/images/tool-icons/marketing-budget-3d.png'),
  'marketing-target': require('../assets/images/tool-icons/marketing-target-3d.png'),
  'marketing-team': require('../assets/images/tool-icons/marketing-team-3d.png'),
  'promotion': require('../assets/images/tool-icons/promotion-3d.png'),
  'promotions': require('../assets/images/tool-icons/promotions-3d.png'),
  'online-promotion': require('../assets/images/tool-icons/online-promotion-3d.png'),
  'conversion-rate': require('../assets/images/tool-icons/conversion-rate-3d.png'),

  // Content & copywriting
  'copywriting': require('../assets/images/tool-icons/copywriting-3d.png'),
  'copywriter': require('../assets/images/tool-icons/copywriter-3d.png'),
  'content-creator': require('../assets/images/tool-icons/content-creator-3d.png'),
  'content-marketing': require('../assets/images/tool-icons/content-marketing-3d.png'),
  'creative': require('../assets/images/tool-icons/creative-3d.png'),

  // SEO & analytics
  'seo': require('../assets/images/tool-icons/seo-3d.png'),
  'optimization': require('../assets/images/tool-icons/optimization-3d.png'),
  'data-analytic': require('../assets/images/tool-icons/data-analytic-3d.png'),
  'analytics': require('../assets/images/tool-icons/analytics-3d.png'),
  'analytics-premium': require('../assets/images/tool-icons/analytics-premium-3d.png'),
  'ab-testing': require('../assets/images/tool-icons/ab-testing-3d.png'),
  'backlink': require('../assets/images/tool-icons/backlink-3d.png'),
  'keyword-research': require('../assets/images/tool-icons/keyword-research-3d.png'),
  'market-analysis': require('../assets/images/tool-icons/market-analysis-3d.png'),

  // Email
  'email': require('../assets/images/tool-icons/email-3d.png'),
  'email-marketing': require('../assets/images/tool-icons/email-marketing-3d.png'),
  'email-notification': require('../assets/images/tool-icons/email-notification-3d.png'),
  'email-campaign': require('../assets/images/tool-icons/email-campaign-3d.png'),

  // Social media generic
  'social-media': require('../assets/images/tool-icons/social-media-3d.png'),
  'social-media-engagement': require('../assets/images/tool-icons/social-media-engagement-3d.png'),
  'hashtag': require('../assets/images/tool-icons/hashtag-3d.png'),

  // E-commerce & product
  'product': require('../assets/images/tool-icons/product-3d.png'),
  'package': require('../assets/images/tool-icons/package-3d.png'),
  'shopify': require('../assets/images/tool-icons/shopify-3d.png'),
  'online-store': require('../assets/images/tool-icons/online-store-3d.png'),

  // Video & media
  'video-player': require('../assets/images/tool-icons/video-player-3d.png'),

  // Reports & dashboard
  'reports': require('../assets/images/tool-icons/reports-3d.png'),
  'web-report': require('../assets/images/tool-icons/web-report-3d.png'),
  'dashboard': require('../assets/images/tool-icons/dashboard-3d.png'),
  'growth-chart': require('../assets/images/tool-icons/growth-chart-3d.png'),

  // Pages & landing
  'landing-page': require('../assets/images/tool-icons/landing-page-3d.png'),
  'landing-page-premium': require('../assets/images/tool-icons/landing-page-premium-3d.png'),
  'mobile-optimization': require('../assets/images/tool-icons/mobile-optimization-3d.png'),

  // AI & automation
  'robot': require('../assets/images/tool-icons/robot-3d.png'),
  'ai': require('../assets/images/tool-icons/ai-3d.png'),
  'automation': require('../assets/images/tool-icons/automation-3d.png'),

  // Security
  'shield': require('../assets/images/tool-icons/shield-3d.png'),
  'padlock': require('../assets/images/tool-icons/padlock-3d.png'),
  'internet-security': require('../assets/images/tool-icons/internet-security-3d.png'),

  // Chat & communication
  'chat': require('../assets/images/tool-icons/chat-3d.png'),
  'feedback': require('../assets/images/tool-icons/feedback-3d.png'),
};

// Map specific tool SLUG to 3D icon (highest priority)
const toolSlugMap: Record<string, keyof typeof ToolIconImages> = {
  // Instagram tools
  'instagram-caption': 'instagram',
  'instagram-captions': 'instagram',
  'instagram-reels-script': 'instagram',
  'instagram-reels': 'instagram',
  'instagram-hashtags': 'instagram',
  'instagram-bio': 'instagram',
  'instagram-story': 'instagram',
  'instagram-caption-generator': 'instagram',
  'instagram-reels-optimizer': 'instagram',

  // Facebook tools
  'facebook-ad-copy': 'facebook',
  'facebook-post': 'facebook',
  'facebook-headline': 'facebook',

  // TikTok tools
  'tiktok-caption': 'tiktok',
  'tiktok-script': 'tiktok',
  'tiktok-ad-creator': 'tiktok',
  'tiktok-ecommerce-ad-creator': 'tiktok',

  // YouTube tools
  'youtube-title': 'youtube',
  'youtube-description': 'youtube',
  'youtube-script': 'youtube',
  'youtube-title-generator': 'youtube',
  'youtube-description-generator': 'youtube',

  // LinkedIn tools
  'linkedin-post': 'linkedin',
  'linkedin-posts': 'linkedin',
  'linkedin-headline': 'linkedin',
  'linkedin-ad-copy-generator': 'linkedin',

  // Twitter/X tools
  'twitter-post': 'x-twitter',
  'tweet-generator': 'x-twitter',
  'twitter-thread-generator': 'x-twitter',

  // Pinterest tools
  'pinterest-ad-generator': 'pinterest',
  'pinterest-pin': 'pinterest',

  // Reddit tools
  'reddit-post': 'reddit',
  'reddit-ad': 'reddit',

  // Product & e-commerce
  'product-description': 'product',
  'product-descriptions': 'product',
  'product-feed-optimizer': 'product',
  'dynamic-product-ads': 'online-ads',
  'cart-recovery-ads': 'ads',

  // Shopify tools
  'shopify-product-title': 'shopify',
  'shopify-product-description': 'shopify',
  'shopify-titles': 'shopify',
  'shopify-collections': 'shopify',
  'shopify-seo-optimizer': 'shopify',
  'shopify-product-page-enhancer': 'shopify',

  // Email tools
  'email-subject-lines': 'email-marketing',
  'email-newsletter': 'email-campaign',
  'cold-outreach-email': 'email-marketing',
  'email-writer': 'email-marketing',
  'product-launch-email-sequence': 'email-notification',

  // Google Ads tools
  'google-ads-headline': 'ads',
  'google-ads-description': 'ads',
  'google-ad-copy': 'ads',
  'google-ads-budget-calculator': 'marketing-budget',
  'ads-grader-pro': 'analytics',

  // SEO tools
  'seo-meta-description': 'seo',
  'seo-title': 'seo',
  'keyword-research-tool': 'keyword-research',
  'keyword-cluster-generator': 'keyword-research',
  'long-tail-keyword-generator': 'keyword-research',
  'keyword-research': 'keyword-research',

  // Blog & content
  'blog-post': 'copywriting',
  'blog-outline': 'copywriting',
  'blog-intro': 'copywriting',
  'blog-post-ideas': 'content-marketing',
  'blog-outline-writer': 'copywriting',
  'article-generator': 'copywriter',
  'blog-writer': 'copywriter',
  'caption-creator': 'content-creator',

  // Meta / general
  'meta-description': 'meta',
  'meme-generator': 'robot',
  'landing-page-copy': 'landing-page',
  'ad-copy': 'advertisement',
  'marketing-plan': 'marketing-strategy',
  'content-calendar': 'content-creator',
  'social-media-post': 'social-media',
  'social-media-post-generator': 'social-media-engagement',
  'hashtag-generator': 'hashtag',
  'ab-test-ideas': 'ab-testing',
  'backlink-outreach': 'backlink',
  'competitor-analysis': 'market-analysis',
  'analytics-report': 'analytics',
  'ga4-grader': 'analytics-premium',
  'video-script': 'video-player',
  'video-ad-script': 'video-ads',
};

// Map tool CATEGORY to 3D icon (fallback)
const categoryMap: Record<string, keyof typeof ToolIconImages> = {
  // Platform categories
  'google-ads': 'ads',
  'google-seo': 'seo',
  'google-analytics': 'data-analytic',
  'google-content': 'copywriting',
  'facebook-ads': 'facebook',
  'instagram': 'instagram',
  'tiktok': 'tiktok',
  'pinterest': 'pinterest',
  'reddit': 'reddit',
  'linkedin': 'linkedin',
  'youtube': 'youtube',
  'twitter': 'x-twitter',
  'social-media': 'social-media',
  'meta-content': 'meta',
  'shopify-products': 'shopify',
  'shopify-ads': 'online-ads',
  'email-marketing': 'email-marketing',
  'ecommerce-seo': 'product',
  'ecommerce': 'online-store',
  'ai-agents': 'robot',
  'content-creation': 'content-creator',

  // Generic categories
  'Ads': 'ads',
  'Social': 'social-media',
  'Email': 'email-marketing',
  'E-commerce': 'product',
  'Video': 'video-player',
  'Creative': 'creative',
  'Content': 'copywriting',
  'SEO': 'seo',
  'Analytics': 'analytics',
  'Strategy': 'marketing-strategy',
  'Automation': 'automation',
  'AI': 'ai',
  'Reports': 'reports',
  'Campaign': 'campaign',
};

// Get 3D icon for a tool (by slug first, then category, then default)
export const getToolIcon = (slugOrCategory: string, category?: string): any => {
  // Try slug first
  const slugKey = toolSlugMap[slugOrCategory];
  if (slugKey && ToolIconImages[slugKey]) return ToolIconImages[slugKey];

  // Try direct icon name match
  if (slugOrCategory in ToolIconImages) return ToolIconImages[slugOrCategory as keyof typeof ToolIconImages];

  // Try category
  if (category) {
    const catKey = categoryMap[category];
    if (catKey && ToolIconImages[catKey]) return ToolIconImages[catKey];

    // Try category as direct icon name
    if (category in ToolIconImages) return ToolIconImages[category as keyof typeof ToolIconImages];
  }

  // Try slugOrCategory as category
  const catKey = categoryMap[slugOrCategory];
  if (catKey && ToolIconImages[catKey]) return ToolIconImages[catKey];

  // Default
  return ToolIconImages['marketing-strategy'];
};

export default ToolIconImages;
