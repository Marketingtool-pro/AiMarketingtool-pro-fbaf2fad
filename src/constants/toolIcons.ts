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
const toolSlugMap: Record<string, string> = {
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
  'negative-keywords': 'keyword',
  'ad-group-builder': 'campaign',
  'google-video-script': 'video-player',
  'landing-page-copy': 'landing-page',
  'quality-score-booster': 'growth-chart',
  'call-only-ads': 'ads',
  'discovery-ads': 'advertisement',
  'remarketing-copy': 'online-ads',
  'app-install-ads': 'ads',

  // GOOGLE SEO
  'seo-meta-title': 'seo',
  'seo-meta-description': 'seo',
  'seo-blog-writer': 'optimized-content',
  'schema-markup': 'sitemap',
  'internal-links': 'link-building',
  'backlink-outreach': 'email',
  'content-brief': 'optimized-content',
  'faq-generator': 'optimized-content',
  'alt-text-writer': 'seo',
  'url-slug-optimizer': 'link-building',
  'competitor-analysis': 'analytics',
  'local-seo-content': 'seo',
  'heading-structure': 'seo',

  // GOOGLE ANALYTICS
  'ga4-reports': 'web-report',
  'ads-grader': 'analytics',
  'ga4-grader': 'growth-chart',
  'conversion-tracker': 'conversion-rate',
  'utm-builder': 'link-building',
  'website-speed-report': 'web-report',

  // GOOGLE CONTENT
  'blog-post-outline': 'copywriting',
  'article-rewriter': 'copywriting',
  'press-release': 'optimized-content',
  'gbp-post': 'marketing-strategy',
  'newsletter-writer': 'email',

  // FACEBOOK ADS
  'facebook-ad-copy': 'facebook',
  'facebook-ads-performance-grader': 'facebook',
  'fb-carousel-ads': 'facebook',
  'fb-lead-ad': 'marketing-target',
  'fb-video-script': 'video-player',
  'fb-retargeting': 'facebook',
  'fb-audience-builder': 'marketing-target',
  'messenger-ad-copy': 'messenger',
  'facebook-carousel': 'facebook',
  'facebook-lead-forms': 'marketing-target',
  'facebook-video-script': 'video-player',
  'facebook-retargeting': 'online-ads',
  'facebook-dynamic': 'online-ads',

  // INSTAGRAM
  'instagram-caption': 'instagram',
  'instagram-captions': 'instagram',
  'instagram-hashtags': 'instagram',
  'reels-script': 'video-player',
  'instagram-reels': 'video-player',
  'story-ideas': 'instagram',
  'instagram-stories': 'instagram',
  'instagram-bio': 'instagram',
  'instagram-bio-optimizer': 'instagram',
  'instagram-hashtag-strategy': 'instagram',
  'instagram-carousel-designer': 'instagram',
  'instagram-ad-creative-generator': 'instagram',

  // SOCIAL MEDIA
  'social-calendar': 'marketing-strategy',
  'social-post': 'meta',
  'engagement-replies': 'meta',
  'poll-quiz': 'meta',
  'hashtag-generator': 'meta',
  'social-media-post-generator': 'meta',
  'caption-creator': 'copywriting',

  // META CONTENT
  'ad-creative-brief': 'copywriting',
  'meme-caption': 'optimized-content',

  // TIKTOK
  'tiktok-script': 'tiktok',
  'tiktok-ad-copy': 'tiktok',
  'tiktok-hashtags': 'tiktok',
  'tiktok-ad-creator': 'tiktok',
  'tiktok-ecommerce-ad-creator': 'online-store',

  // YOUTUBE
  'youtube-title': 'youtube',
  'youtube-description': 'youtube',
  'youtube-script': 'youtube',
  'youtube-tags': 'youtube',
  'youtube-title-generator': 'youtube',
  'youtube-description-generator': 'youtube',

  // LINKEDIN
  'linkedin-post': 'linkedin',
  'linkedin-ad-copy': 'linkedin',
  'linkedin-bio': 'linkedin',
  'linkedin-posts': 'linkedin',
  'linkedin-ad-copy-generator': 'linkedin',

  // TWITTER/X
  'tweet-generator': 'x-twitter',
  'twitter-thread': 'x-twitter',
  'x-ads-copy': 'x-twitter',
  'viral-tweets': 'x-twitter',
  'twitter-thread-generator': 'x-twitter',

  // PINTEREST
  'pinterest-description': 'pinterest',
  'pinterest-boards': 'pinterest',
  'pinterest-ad-generator': 'pinterest',

  // SHOPIFY PRODUCTS
  'product-title-optimizer': 'online-store',
  'product-description': 'product-trolley',
  'product-bullets': 'product-trolley',
  'collection-description': 'online-store',
  'review-response': 'online-store',
  'product-comparison': 'product-trolley',
  'product-descriptions': 'product-trolley',
  'product-feed-optimizer': 'online-store',
  'product-description-writer': 'product-trolley',
  'shopify-titles': 'online-store',
  'shopify-collections': 'online-store',
  'amazon-listings': 'online-store',
  'shopify-seo-optimizer': 'seo',
  'shopify-product-page-enhancer': 'landing-page',
  'shopify-store-audit': 'online-store',

  // SHOPPING ADS
  'shopping-title': 'product-trolley',
  'shopping-titles': 'product-trolley',
  'fb-shop-ads': 'facebook',
  'sale-promo-ads': 'online-ads',
  'abandoned-cart-ads': 'conversion-rate',
  'dynamic-product-ads': 'online-ads',
  'cart-recovery-ads': 'conversion-rate',

  // EMAIL MARKETING
  'welcome-email-series': 'email',
  'abandoned-cart-email': 'email',
  'email-subject-lines': 'email',
  'product-launch-email': 'email',
  'win-back-email': 'email',
  'abandoned-cart': 'email',
  'welcome-emails': 'email',
  'launch-emails': 'email',
  'email-subjects': 'email',
  'cold-outreach-email': 'email',
  'email-writer': 'email',
  'product-launch-email-sequence': 'email',
  'backlink-outreach-email-generator': 'email',

  // E-COMMERCE SEO
  'product-page-seo': 'seo',
  'store-blog': 'optimized-content',
  'category-seo': 'seo',
  'product-schema': 'sitemap',

  // AI AGENTS
  'ai-campaign-optimizer': 'bot',
  'ai-content-planner': 'bot',
  'ai-budget-allocator': 'bot',
  'ai-ab-test': 'bot',
  'ai-trend-detector': 'bot',
  'ai-chatbot': 'bot',
  'ai-analyzer': 'bot',
  'ai-budget': 'bot',
  'ai-campaign-manager': 'bot',

  // BLOG & CONTENT
  'blog-post-ideas': 'optimized-content',
  'blog-outline-writer': 'copywriting',
  'article-generator': 'copywriting',
  'blog-writer': 'optimized-content',

  // SEO KEYWORD TOOLS
  'keyword-research-tool': 'keyword',
  'keyword-cluster-generator': 'search-volume',
  'long-tail-keyword-generator': 'search-engine',

  // CONTENT CREATION
  'meme-generator': 'optimized-content',
  'ai-image-caption': 'optimized-content',
  'quote-image': 'optimized-content',
  'thumbnail-generator': 'video-player',
  'story-templates': 'instagram',

  // COPYWRITING & CONTENT
  'content-rewriter': 'copywriting',
  'article-summarizer': 'copywriting',
  'cta-writer': 'conversion-rate',
  'sales-page-copy-writer': 'landing-page',
  'marketing-copy-generator': 'copywriting',
  'brand-voice-generator': 'marketing-strategy',
  'paragraph-rewriter': 'copywriting',
  'testimonial-generator': 'marketing-target',
  'case-study-writer': 'optimized-content',
  'press-release-generator': 'optimized-content',

  // SEO EXTENDED
  'seo-audit-tool': 'seo',
  'on-page-seo-checker': 'seo',
  'content-gap-finder': 'search-volume',
  'competitor-analysis-tool': 'analytics',
  'seo-title-generator': 'seo',
  'website-grader': 'web-report',
  'faq-schema-writer': 'sitemap',
  'landing-page-audit': 'landing-page',

  // LEAD GEN & BUSINESS
  'lead-magnet-creator': 'marketing-target',
  'roi-calculator': 'growth-chart',

  // GOOGLE ADS EXTENDED
  'google-ads-quality-score': 'ads',
  'google-ads-performance-grader': 'analytics',
  'negative-keywords-tool': 'keyword',

  // META EXTENDED
  'meta-audience-builder': 'marketing-target',

  // MARKETING STRATEGY
  'marketing-calendar': 'marketing-strategy',
  'marketing-budget-planner': 'marketing-budget',
  'marketing-proposal-generator': 'optimized-content',

  // PODCAST & WEBINAR
  'webinar-script-writer': 'video-player',
  'podcast-script-writer': 'video-player',

  // OTHER
  'comparison-chart-creator': 'optimized-content',
  'market-research-summary': 'marketing-strategy',
  'affiliate-marketing-copy': 'conversion-rate',
  'copy-generator': 'copywriting',
  'engagement-calculator': 'analytics',
};

// Map tool CATEGORY to 3D icon (fallback)
const categoryMap: Record<string, string> = {
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
  'copywriting': 'copywriting',
};

// Get 3D icon for a tool
export const getToolIcon = (slugOrCategory: string, category?: string): any => {
  const slugKey = toolSlugMap[slugOrCategory];
  if (slugKey && (ToolIconImages as any)[slugKey]) return (ToolIconImages as any)[slugKey];

  if (slugOrCategory in ToolIconImages) return (ToolIconImages as any)[slugOrCategory];

  if (category) {
    const catKey = categoryMap[category];
    if (catKey && (ToolIconImages as any)[catKey]) return (ToolIconImages as any)[catKey];
  }

  const catKey = categoryMap[slugOrCategory];
  if (catKey && (ToolIconImages as any)[catKey]) return (ToolIconImages as any)[catKey];

  return (ToolIconImages as any)['marketing-strategy'];
};

export default ToolIconImages;
