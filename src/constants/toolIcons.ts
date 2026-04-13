// Tool icon mapping — category-based with keyword fallback
// Icons: 317 compressed PNGs (128x128) in tool-icons-v2/

const ToolIconImages: Record<string, any> = {
  // === AI / Machine Learning ===
  'ai': require('../assets/images/tool-icons-v2/ai brain.png'),
  'ai-brain': require('../assets/images/tool-icons-v2/ai brain.png'),
  'ai-chat': require('../assets/images/tool-icons-v2/ai idea.png'),
  'ai-generator': require('../assets/images/tool-icons-v2/ai generator.png'),
  'ai-image': require('../assets/images/tool-icons-v2/ai image generator.png'),
  'ai-robot': require('../assets/images/tool-icons-v2/01 ai robot.png'),
  'ai-chip': require('../assets/images/tool-icons-v2/ai chip.png'),
  'ai-scanner': require('../assets/images/tool-icons-v2/ai scanner.png'),
  'ai-server': require('../assets/images/tool-icons-v2/ai server.png'),
  'ai-programming': require('../assets/images/tool-icons-v2/ai proggamming.png'),
  'artificial-intelligence': require('../assets/images/tool-icons-v2/5 Artificial Intelligence.png'),

  // === SEO ===
  'seo': require('../assets/images/tool-icons-v2/1 SEO.png'),
  'keyword': require('../assets/images/tool-icons-v2/5 Keyword.png'),
  'keyword-research': require('../assets/images/tool-icons-v2/16 - Keyword Research.png'),
  'backlink': require('../assets/images/tool-icons-v2/17 - Backlink.png'),
  'link-building': require('../assets/images/tool-icons-v2/10 Link Building.png'),
  'sitemap': require('../assets/images/tool-icons-v2/15 Sitemap.png'),
  'crawling': require('../assets/images/tool-icons-v2/13 Crawling.png'),
  'indexing': require('../assets/images/tool-icons-v2/14 Indexing.png'),
  'search-engine': require('../assets/images/tool-icons-v2/4 Search Engine.png'),
  'search-volume': require('../assets/images/tool-icons-v2/6 Search Volume.png'),
  'website-traffic': require('../assets/images/tool-icons-v2/3 Website Traffic.png'),
  'on-page-seo': require('../assets/images/tool-icons-v2/28 On-Page SEO.png'),
  'off-page-seo': require('../assets/images/tool-icons-v2/29 Off-Page SEO.png'),
  'technical-seo': require('../assets/images/tool-icons-v2/30 Technical SEO.png'),
  'authority': require('../assets/images/tool-icons-v2/12 Authority.png'),
  'analytics': require('../assets/images/tool-icons-v2/11 Analytics.png'),
  'optimization': require('../assets/images/tool-icons-v2/19 - Optimization.png'),

  // === Marketing & Ads ===
  'marketing': require('../assets/images/tool-icons-v2/19 Marketing Strategy.png'),
  'marketing-strategy': require('../assets/images/tool-icons-v2/6 - Marketing Strategy.png'),
  'marketing-campaign': require('../assets/images/tool-icons-v2/25 Marketing Campaign.png'),
  'marketing-target': require('../assets/images/tool-icons-v2/10. Marketing Target.png'),
  'promotion': require('../assets/images/tool-icons-v2/4 - Promotion.png'),
  'advertisement': require('../assets/images/tool-icons-v2/27 Advertisement.png'),
  'conversion': require('../assets/images/tool-icons-v2/26 Conversion Rate.png'),
  'ab-testing': require('../assets/images/tool-icons-v2/20 - AB Testing.png'),
  'landing-page': require('../assets/images/tool-icons-v2/18 Landing Page.png'),
  'hashtag': require('../assets/images/tool-icons-v2/7 - Hashtag.png'),
  'internet-marketing': require('../assets/images/tool-icons-v2/24 Internet Marketing.png'),
  'traditional-marketing': require('../assets/images/tool-icons-v2/23 Traditional Marketing.png'),
  'promotions': require('../assets/images/tool-icons-v2/22 Promotions.png'),

  // === Content & Copywriting ===
  'content': require('../assets/images/tool-icons-v2/15 - Content Marketing.png'),
  'copywriting': require('../assets/images/tool-icons-v2/7 Copywriting.png'),
  'content-marketing': require('../assets/images/tool-icons-v2/15 - Content Marketing.png'),
  'optimized-content': require('../assets/images/tool-icons-v2/8 Optimized Content.png'),
  'presentation': require('../assets/images/tool-icons-v2/3 - Presentation.png'),
  'blog': require('../assets/images/tool-icons-v2/11 - Copywriting.png'),

  // === Email ===
  'email': require('../assets/images/tool-icons-v2/2 - Email Marketing.png'),
  'email-marketing': require('../assets/images/tool-icons-v2/2 - Email Marketing.png'),
  'email-campaign': require('../assets/images/tool-icons-v2/2. Email Campaign.png'),

  // === Social Media ===
  'social': require('../assets/images/tool-icons-v2/13 - Social Media Engagement.png'),
  'social-media': require('../assets/images/tool-icons-v2/13 - Social Media Engagement.png'),
  'facebook': require('../assets/images/tool-icons-v2/01_Facebook.png'),
  'meta': require('../assets/images/tool-icons-v2/01_Facebook.png'),
  'instagram': require('../assets/images/tool-icons-v2/02_Instagram.png'),
  'twitter': require('../assets/images/tool-icons-v2/03_X.png'),
  'x': require('../assets/images/tool-icons-v2/03_X.png'),
  'linkedin': require('../assets/images/tool-icons-v2/04_LinkedIn.png'),
  'youtube': require('../assets/images/tool-icons-v2/05_Youtube.png'),
  'whatsapp': require('../assets/images/tool-icons-v2/06_WhatsApp.png'),
  'reddit': require('../assets/images/tool-icons-v2/07_Reddit.png'),
  'tumblr': require('../assets/images/tool-icons-v2/08_Tumblr.png'),
  'snapchat': require('../assets/images/tool-icons-v2/09_Snapchat.png'),
  'tiktok': require('../assets/images/tool-icons-v2/10_TikTok.png'),
  'pinterest': require('../assets/images/tool-icons-v2/11_Pinterest.png'),
  'telegram': require('../assets/images/tool-icons-v2/12_Telegram.png'),

  // === E-commerce ===
  'ecommerce': require('../assets/images/tool-icons-v2/eCommerce.png'),
  'shopify': require('../assets/images/tool-icons-v2/Desktop Shop.png'),
  'product': require('../assets/images/tool-icons-v2/Shopping Bag.png'),
  'cart': require('../assets/images/tool-icons-v2/Shopping Cart.png'),
  'store': require('../assets/images/tool-icons-v2/6. Store.png'),
  'payment': require('../assets/images/tool-icons-v2/Payment.png'),
  'price': require('../assets/images/tool-icons-v2/Price Tag.png'),
  'sale': require('../assets/images/tool-icons-v2/Sale.png'),
  'discount': require('../assets/images/tool-icons-v2/Discount.png'),
  'delivery': require('../assets/images/tool-icons-v2/Fast Delivery.png'),
  'shipping': require('../assets/images/tool-icons-v2/Worldwide Shipping.png'),

  // === Data & Analytics ===
  'data': require('../assets/images/tool-icons-v2/1 - Data Analytic.png'),
  'data-analytic': require('../assets/images/tool-icons-v2/1 - Data Analytic.png'),
  'market-analysis': require('../assets/images/tool-icons-v2/18 - Market Analysis.png'),
  'sales-analytics': require('../assets/images/tool-icons-v2/Sales Analytics.png'),
  'feedback': require('../assets/images/tool-icons-v2/14 - Feedback.png'),
  'review': require('../assets/images/tool-icons-v2/Review.png'),
  'rating': require('../assets/images/tool-icons-v2/Rating.png'),

  // === Ads / PPC ===
  'ads': require('../assets/images/tool-icons-v2/12. Mobile Ads.png'),
  'ppc': require('../assets/images/tool-icons-v2/20. Pay Per Click.png'),
  'google': require('../assets/images/tool-icons-v2/12 - Internet Search.png'),
  'google-ads': require('../assets/images/tool-icons-v2/20. Pay Per Click.png'),
  'video-ads': require('../assets/images/tool-icons-v2/9. Video Ads.png'),
  'online-ads': require('../assets/images/tool-icons-v2/6. Online Ads2.png'),
  'mobile-ads': require('../assets/images/tool-icons-v2/12. Mobile Ads.png'),

  // === Tech & Cloud ===
  'cloud': require('../assets/images/tool-icons-v2/cloud.png'),
  'server': require('../assets/images/tool-icons-v2/Server.png'),
  'security': require('../assets/images/tool-icons-v2/5 - Internet Security.png'),
  'mobile': require('../assets/images/tool-icons-v2/22 - Mobile Optimization.png'),
  'web': require('../assets/images/tool-icons-v2/1. Web Report.png'),
  'api': require('../assets/images/tool-icons-v2/Servers.png'),
  'domain': require('../assets/images/tool-icons-v2/23 Domain.png'),
  'notification': require('../assets/images/tool-icons-v2/Notification promo.png'),
  'calendar': require('../assets/images/tool-icons-v2/Calendar.png'),
  'chat': require('../assets/images/tool-icons-v2/Chat.png'),
  'camera': require('../assets/images/tool-icons-v2/Camera.png'),
  'video': require('../assets/images/tool-icons-v2/Video_Player.png'),
  'file': require('../assets/images/tool-icons-v2/File manager.png'),
  'contact': require('../assets/images/tool-icons-v2/Contact.png'),
  'setting': require('../assets/images/tool-icons-v2/Setting.png'),

  // === Team & People ===
  'team': require('../assets/images/tool-icons-v2/20 SEO Team.png'),
  'marketing-team': require('../assets/images/tool-icons-v2/21 Marketing Team.png'),
  'customer': require('../assets/images/tool-icons-v2/13. Customer Engagement.png'),
  'lead': require('../assets/images/tool-icons-v2/15. Lead Magnet.png'),
  'user': require('../assets/images/tool-icons-v2/5. User Targeting2.png'),
  'audience': require('../assets/images/tool-icons-v2/14. Customer Network.png'),

  // === Creative ===
  'meme': require('../assets/images/tool-icons-v2/Game.png'),
  'image': require('../assets/images/tool-icons-v2/Gallery.png'),
  'design': require('../assets/images/tool-icons-v2/Screen.png'),
  'brand': require('../assets/images/tool-icons-v2/Badge discount.png'),
};

const DEFAULT_ICON = require('../assets/images/tool-icons-v2/19 Marketing Strategy.png');

export function getToolIcon(slug: string, category?: string): any {
  const normalized = slug.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  // Direct slug match
  if (ToolIconImages[normalized]) return ToolIconImages[normalized];

  // Category match
  if (category) {
    const catKey = category.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (ToolIconImages[catKey]) return ToolIconImages[catKey];
  }

  // Keyword match — check if any key appears in the slug
  const keys = Object.keys(ToolIconImages);
  for (const key of keys) {
    if (normalized.includes(key) && key.length > 3) return ToolIconImages[key];
  }

  // Reverse — check if slug contains any key
  const parts = normalized.split('-').filter(p => p.length > 3);
  for (const key of keys) {
    if (parts.some(p => key.includes(p))) return ToolIconImages[key];
  }

  return DEFAULT_ICON;
}
