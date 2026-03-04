// 3D Tool Icons - mapped by category/badge and tool slug
const ToolIconImages = {
  // Social platforms
  'facebook': require('../assets/images/tool-icons/facebook-3d.png'),
  'instagram': require('../assets/images/tool-icons/instagram-3d.png'),
  'meta': require('../assets/images/tool-icons/meta-3d.png'),
  'youtube': require('../assets/images/tool-icons/youtube-3d.png'),
  'linkedin': require('../assets/images/tool-icons/linkedin-3d.png'),
  'x-twitter': require('../assets/images/tool-icons/x-3d.png'),
  'social-media': require('../assets/images/tool-icons/social-media-engagement-3d.png'),

  // Marketing & strategy
  'marketing-strategy': require('../assets/images/tool-icons/marketing-strategy-3d.png'),
  'copywriting': require('../assets/images/tool-icons/copywriting-3d.png'),
  'data-analytic': require('../assets/images/tool-icons/data-analytic-3d.png'),
  'optimization': require('../assets/images/tool-icons/optimization-3d.png'),
  'promotion': require('../assets/images/tool-icons/promotion-3d.png'),
  'backlink': require('../assets/images/tool-icons/backlink-3d.png'),
  'ab-testing': require('../assets/images/tool-icons/ab-testing-3d.png'),
  'seo': require('../assets/images/tool-icons/seo-3d.png'),
  'analytics': require('../assets/images/tool-icons/11-analytics.png'),
  'marketing-team': require('../assets/images/tool-icons/21-marketing-team.png'),
  'promotions': require('../assets/images/tool-icons/22-promotions.png'),

  // New icons for popular tools
  'email-marketing': require('../assets/images/tool-icons/email-marketing-3d.png'),
  'email-notification': require('../assets/images/tool-icons/email-notification-3d.png'),
  'video-player': require('../assets/images/tool-icons/video-player-3d.png'),
  'robot': require('../assets/images/tool-icons/robot-3d.png'),
  'ads': require('../assets/images/tool-icons/ads-3d.png'),
  'product': require('../assets/images/tool-icons/product-3d.png'),
  'shopify': require('../assets/images/tool-icons/shopify-3d.png'),
  'growth-chart': require('../assets/images/tool-icons/growth-chart-3d.png'),
  'copywriter': require('../assets/images/tool-icons/copywriter-3d.png'),
  'content-creator': require('../assets/images/tool-icons/content-creator-3d.png'),
  'campaign': require('../assets/images/tool-icons/campaign-3d.png'),
  'advertisement': require('../assets/images/tool-icons/advertisement-3d.png'),
};

// Map specific tool SLUG to 3D icon (highest priority)
const toolSlugMap: Record<string, keyof typeof ToolIconImages> = {
  'instagram-caption': 'instagram',
  'instagram-captions': 'instagram',
  'instagram-reels-script': 'video-player',
  'instagram-reels': 'video-player',
  'instagram-hashtags': 'instagram',
  'instagram-bio': 'instagram',
  'instagram-story': 'instagram',
  'facebook-ad-copy': 'facebook',
  'facebook-post': 'facebook',
  'facebook-headline': 'facebook',
  'product-description': 'product',
  'product-descriptions': 'product',
  'shopify-product-title': 'shopify',
  'shopify-product-description': 'shopify',
  'shopify-titles': 'shopify',
  'shopify-collections': 'shopify',
  'email-subject-lines': 'email-marketing',
  'email-newsletter': 'email-notification',
  'google-ads-headline': 'ads',
  'google-ads-description': 'ads',
  'google-ad-copy': 'ads',
  'meme-generator': 'robot',
  'seo-meta-description': 'seo',
  'seo-title': 'seo',
  'blog-post': 'copywriting',
  'blog-outline': 'copywriting',
  'blog-intro': 'copywriting',
  'youtube-title': 'youtube',
  'youtube-description': 'youtube',
  'youtube-script': 'youtube',
  'linkedin-post': 'linkedin',
  'linkedin-posts': 'linkedin',
  'linkedin-headline': 'linkedin',
  'twitter-post': 'x-twitter',
  'tweet-generator': 'x-twitter',
  'meta-description': 'meta',
  'tiktok-caption': 'video-player',
  'tiktok-script': 'video-player',
  'landing-page-copy': 'campaign',
  'ad-copy': 'advertisement',
  'marketing-plan': 'marketing-strategy',
  'content-calendar': 'content-creator',
  'social-media-post': 'social-media',
  'ab-test-ideas': 'ab-testing',
  'backlink-outreach': 'backlink',
  'keyword-research': 'optimization',
  'competitor-analysis': 'data-analytic',
  'analytics-report': 'analytics',
  // New tools added from web
  'google-ads-budget-calculator': 'ads',
  'ads-grader-pro': 'ads',
  'ga4-grader': 'analytics',
  'instagram-caption-generator': 'instagram',
  'instagram-reels-optimizer': 'instagram',
  'cold-outreach-email': 'email-marketing',
  'email-writer': 'email-marketing',
  'product-launch-email-sequence': 'email-notification',
  'keyword-research-tool': 'seo',
  'keyword-cluster-generator': 'seo',
  'long-tail-keyword-generator': 'seo',
  'hashtag-generator': 'social-media',
  'social-media-post-generator': 'social-media',
  'caption-creator': 'content-creator',
  'dynamic-product-ads': 'ads',
  'product-feed-optimizer': 'shopify',
  'cart-recovery-ads': 'ads',
  'blog-post-ideas': 'copywriting',
  'blog-outline-writer': 'copywriting',
  'article-generator': 'copywriting',
  'blog-writer': 'copywriting',
  'shopify-seo-optimizer': 'shopify',
  'shopify-product-page-enhancer': 'shopify',
  'tiktok-ad-creator': 'video-player',
  'tiktok-ecommerce-ad-creator': 'video-player',
  'twitter-thread-generator': 'x-twitter',
  'linkedin-ad-copy-generator': 'linkedin',
  'pinterest-ad-generator': 'promotion',
  'youtube-title-generator': 'youtube',
  'youtube-description-generator': 'youtube',
};

// Map tool CATEGORY to 3D icon (fallback)
const categoryMap: Record<string, keyof typeof ToolIconImages> = {
  'google-ads': 'ads',
  'google-seo': 'seo',
  'google-analytics': 'data-analytic',
  'google-content': 'copywriting',
  'facebook-ads': 'facebook',
  'instagram': 'instagram',
  'social-media': 'social-media',
  'meta-content': 'meta',
  'shopify-products': 'shopify',
  'shopify-ads': 'ads',
  'email-marketing': 'email-marketing',
  'ecommerce-seo': 'product',
  'ai-agents': 'robot',
  'content-creation': 'content-creator',
  'Ads': 'ads',
  'Social': 'social-media',
  'Email': 'email-marketing',
  'E-commerce': 'product',
  'Video': 'video-player',
  'Creative': 'robot',
  'Content': 'copywriting',
  'SEO': 'seo',
  'Analytics': 'analytics',
};

// Get 3D icon for a tool (by slug first, then category, then default)
export const getToolIcon = (slugOrCategory: string, category?: string): any => {
  // Try slug first
  const slugKey = toolSlugMap[slugOrCategory];
  if (slugKey && ToolIconImages[slugKey]) return ToolIconImages[slugKey];

  // Try category
  if (category) {
    const catKey = categoryMap[category];
    if (catKey && ToolIconImages[catKey]) return ToolIconImages[catKey];
  }

  // Try slugOrCategory as category
  const catKey = categoryMap[slugOrCategory];
  if (catKey && ToolIconImages[catKey]) return ToolIconImages[catKey];

  // Default
  return ToolIconImages['marketing-strategy'];
};

export default ToolIconImages;
