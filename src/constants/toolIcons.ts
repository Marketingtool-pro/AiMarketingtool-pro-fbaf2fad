// 3D Tool Icons v2 - Upgraded high-quality assets from live app
const ToolIconImages = {
  // Social platforms
  'facebook': require('../assets/images/tool-icons-v2/facebook.png'),
  'instagram': require('../assets/images/tool-icons-v2/instagram.png'),
  'meta': require('../assets/images/tool-icons-v2/meta.png'),
  'youtube': require('../assets/images/tool-icons-v2/youtube.png'),
  'linkedin': require('../assets/images/tool-icons-v2/linkedin.png'),
  'x-twitter': require('../assets/images/tool-icons-v2/x-twitter.png'),
  'tiktok': require('../assets/images/tool-icons-v2/tiktok.png'),
  'pinterest': require('../assets/images/tool-icons-v2/pinterest.png'),
  'reddit': require('../assets/images/tool-icons-v2/reddit.png'),
  'snapchat': require('../assets/images/tool-icons-v2/snapchat.png'),
  'telegram': require('../assets/images/tool-icons-v2/telegram.png'),
  'whatsapp': require('../assets/images/tool-icons-v2/whatsapp.png'),
  'medium': require('../assets/images/tool-icons-v2/medium.png'),
  'messenger': require('../assets/images/tool-icons-v2/messenger.png'),

  // Ads & campaigns
  'ads': require('../assets/images/tool-icons-v2/ads.png'),
  'advertisement': require('../assets/images/tool-icons-v2/advertisement.png'),
  'online-ads': require('../assets/images/tool-icons-v2/online-promotion.png'),
  'campaign': require('../assets/images/tool-icons-v2/marketing-campaign.png'),
  'sem': require('../assets/images/tool-icons-v2/sem.png'),

  // Marketing & strategy
  'marketing-strategy': require('../assets/images/tool-icons-v2/marketing-strategy.png'),
  'strategy': require('../assets/images/tool-icons-v2/marketing-strategy.png'),
  'marketing-budget': require('../assets/images/tool-icons-v2/marketing-budget.png'),
  'marketing-target': require('../assets/images/tool-icons-v2/marketing-target.png'),
  'conversion-rate': require('../assets/images/tool-icons-v2/conversion-rate.png'),
  'online-payment': require('../assets/images/tool-icons-v2/online-payment.png'),
  'online-business': require('../assets/images/tool-icons-v2/online-business.png'),

  // Content & copywriting
  'copywriting': require('../assets/images/tool-icons-v2/copywriting.png'),
  'optimized-content': require('../assets/images/tool-icons-v2/optimized-content.png'),

  // SEO & analytics
  'seo': require('../assets/images/tool-icons-v2/seo.png'),
  'search-engine': require('../assets/images/tool-icons-v2/search-engine.png'),
  'analytics': require('../assets/images/tool-icons-v2/analytics.png'),
  'search-volume': require('../assets/images/tool-icons-v2/search-volume.png'),
  'sitemap': require('../assets/images/tool-icons-v2/sitemap.png'),
  'link-building': require('../assets/images/tool-icons-v2/link-building.png'),
  'landing-page': require('../assets/images/tool-icons-v2/landing-page.png'),
  'web-report': require('../assets/images/tool-icons-v2/web-report.png'),
  'growth-chart': require('../assets/images/tool-icons-v2/growth-chart.png'),

  // Email
  'email': require('../assets/images/tool-icons-v2/email-notification.png'),
  'email-notification': require('../assets/images/tool-icons-v2/email-notification.png'),

  // E-commerce & product
  'product-trolley': require('../assets/images/tool-icons-v2/product-trolley.png'),
  'online-store': require('../assets/images/tool-icons-v2/online-store.png'),
  'payment-card': require('../assets/images/tool-icons-v2/payment-card.png'),

  // Video & media
  'video-player': require('../assets/images/tool-icons-v2/video-player.png'),

  // AI & automation
  'bot': require('../assets/images/tool-icons-v2/bot.png'),
  'shield': require('../assets/images/tool-icons-v2/shield.png'),
  'padlock': require('../assets/images/tool-icons-v2/padlock.png'),
  'keyword': require('../assets/images/tool-icons-v2/keyword.png'),
};

// Map specific tool SLUG to 3D icon
const toolSlugMap: Record<string, keyof typeof ToolIconImages> = {
  // GOOGLE ADS
  'google-ads-headline': 'ads',
  'google-ads-description': 'sem',
  'google-pmax': 'ads',
  'google-display-copy': 'advertisement',
  'google-shopping-feed': 'product-trolley',
  'google-rsa': 'search-engine',
  'google-extensions': 'link-building',
  'google-keyword-ai': 'keyword',
  'google-ads-budget-calculator': 'online-payment',
  'ads-grader-pro': 'analytics',

  // GOOGLE SEO
  'seo-meta-title': 'seo',
  'seo-meta-description': 'seo',
  'seo-blog-writer': 'optimized-content',
  'schema-markup': 'sitemap',
  'internal-links': 'link-building',

  // GOOGLE ANALYTICS
  'ga4-reports': 'web-report',
  'ads-grader': 'analytics',
  'ga4-grader': 'growth-chart',

  // INSTAGRAM
  'instagram-captions': 'instagram',
  'instagram-reels': 'video-player',
  'instagram-stories': 'instagram',
  'instagram-hashtags': 'instagram',
  'instagram-bio': 'instagram',

  // FACEBOOK
  'facebook-ad-copy': 'facebook',
  'facebook-carousel': 'facebook',
  'facebook-lead-forms': 'marketing-target',
  'facebook-video-script': 'video-player',
  'facebook-retargeting': 'online-promotion',
  'facebook-dynamic': 'online-ads',

  // TIKTOK
  'tiktok-ad-creator': 'tiktok',
  'tiktok-ecommerce-ad-creator': 'online-store',

  // YOUTUBE
  'youtube-title-generator': 'youtube',
  'youtube-description-generator': 'youtube',

  // TWITTER/X
  'viral-tweets': 'x-twitter',
  'twitter-thread-generator': 'x-twitter',

  // LINKEDIN
  'linkedin-posts': 'linkedin',
  'linkedin-ad-copy-generator': 'linkedin',

  // PINTEREST
  'pinterest-ad-generator': 'pinterest',

  // SOCIAL MEDIA GENERIC
  'social-calendar': 'marketing-strategy',
  'hashtag-generator': 'meta',
  'social-media-post-generator': 'meta',
  'caption-creator': 'copywriting',

  // PRODUCT & E-COMMERCE
  'product-descriptions': 'product-trolley',
  'product-feed-optimizer': 'online-store',
  'dynamic-product-ads': 'online-ads',
  'cart-recovery-ads': 'conversion-rate',

  // SHOPIFY
  'shopify-titles': 'online-store',
  'shopify-collections': 'online-store',
  'product-bullets': 'product-trolley',
  'amazon-listings': 'online-store',
  'shopping-titles': 'product-trolley',
  'shopify-seo-optimizer': 'seo',
  'shopify-product-page-enhancer': 'landing-page',

  // EMAIL
  'abandoned-cart': 'email',
  'welcome-emails': 'email',
  'launch-emails': 'email',
  'email-subjects': 'email',
  'cold-outreach-email': 'email',
  'email-writer': 'email',
  'product-launch-email-sequence': 'email',

  // BLOG & CONTENT
  'blog-post-ideas': 'optimized-content',
  'blog-outline-writer': 'copywriting',
  'article-generator': 'copywriting',
  'blog-writer': 'optimized-content',

  // SEO KEYWORD TOOLS
  'keyword-research-tool': 'keyword',
  'keyword-cluster-generator': 'search-volume',
  'long-tail-keyword-generator': 'search-engine',

  // AI AGENTS
  'ai-campaign-optimizer': 'bot',
  'ai-content-planner': 'bot',
  'ai-chatbot': 'bot',
  'ai-analyzer': 'bot',
  'ai-budget': 'bot',

  // CONTENT CREATION
  'meme-generator': 'optimized-content',
  'ai-image-caption': 'optimized-content',
  'quote-image': 'optimized-content',
  'thumbnail-generator': 'video-player',
  'story-templates': 'instagram',
};

// Map tool CATEGORY to 3D icon (fallback)
const categoryMap: Record<string, keyof typeof ToolIconImages> = {
  'google-ads': 'ads',
  'google-seo': 'seo',
  'google-analytics': 'analytics',
  'google-content': 'copywriting',
  'facebook-ads': 'facebook',
  'instagram': 'instagram',
  'tiktok': 'tiktok',
  'pinterest': 'pinterest',
  'reddit': 'reddit',
  'linkedin': 'linkedin',
  'youtube': 'youtube',
  'twitter': 'x-twitter',
  'social-media': 'meta',
  'meta-content': 'meta',
  'shopify-products': 'online-store',
  'shopify-ads': 'online-ads',
  'email-marketing': 'email',
  'ecommerce-seo': 'seo',
  'ecommerce': 'online-store',
  'ai-agents': 'bot',
  'content-creation': 'optimized-content',
};

// Get 3D icon for a tool
export const getToolIcon = (slugOrCategory: string, category?: string): any => {
  const slugKey = toolSlugMap[slugOrCategory];
  if (slugKey && ToolIconImages[slugKey]) return ToolIconImages[slugKey];

  if (slugOrCategory in ToolIconImages) return ToolIconImages[slugOrCategory as keyof typeof ToolIconImages];

  if (category) {
    const catKey = categoryMap[category];
    if (catKey && ToolIconImages[catKey]) return ToolIconImages[catKey];
  }

  const catKey = categoryMap[slugOrCategory];
  if (catKey && ToolIconImages[catKey]) return ToolIconImages[catKey];

  return ToolIconImages['marketing-strategy'];
};

export default ToolIconImages;
