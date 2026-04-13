// Tool icon mapping — category-based with keyword fallback
// All filenames lowercase-hyphen, 128x128 PNG

const ToolIconImages: Record<string, any> = {
  // === AI ===
  'ai': require('../assets/images/tool-icons-v2/ai-brain.png'),
  'ai-brain': require('../assets/images/tool-icons-v2/ai-brain.png'),
  'ai-chat': require('../assets/images/tool-icons-v2/ai-idea.png'),
  'ai-generator': require('../assets/images/tool-icons-v2/ai-generator.png'),
  'ai-image': require('../assets/images/tool-icons-v2/ai-image-generator.png'),
  'ai-robot': require('../assets/images/tool-icons-v2/01-ai-robot.png'),
  'ai-chip': require('../assets/images/tool-icons-v2/ai-chip.png'),
  'ai-scanner': require('../assets/images/tool-icons-v2/ai-scanner.png'),
  'ai-server': require('../assets/images/tool-icons-v2/ai-server.png'),
  'artificial-intelligence': require('../assets/images/tool-icons-v2/5-artificial-intelligence.png'),

  // === SEO ===
  'seo': require('../assets/images/tool-icons-v2/1-seo.png'),
  'keyword': require('../assets/images/tool-icons-v2/5-keyword.png'),
  'keyword-research': require('../assets/images/tool-icons-v2/16---keyword-research.png'),
  'backlink': require('../assets/images/tool-icons-v2/17---backlink.png'),
  'link-building': require('../assets/images/tool-icons-v2/10-link-building.png'),
  'sitemap': require('../assets/images/tool-icons-v2/15-sitemap.png'),
  'crawling': require('../assets/images/tool-icons-v2/13-crawling.png'),
  'indexing': require('../assets/images/tool-icons-v2/14-indexing.png'),
  'search-engine': require('../assets/images/tool-icons-v2/4-search-engine.png'),
  'search-volume': require('../assets/images/tool-icons-v2/6-search-volume.png'),
  'website-traffic': require('../assets/images/tool-icons-v2/3-website-traffic.png'),
  'on-page-seo': require('../assets/images/tool-icons-v2/28-on-page-seo.png'),
  'off-page-seo': require('../assets/images/tool-icons-v2/29-off-page-seo.png'),
  'technical-seo': require('../assets/images/tool-icons-v2/30-technical-seo.png'),
  'authority': require('../assets/images/tool-icons-v2/12-authority.png'),
  'analytics': require('../assets/images/tool-icons-v2/11-analytics.png'),
  'optimization': require('../assets/images/tool-icons-v2/19---optimization.png'),

  // === Marketing & Ads ===
  'marketing': require('../assets/images/tool-icons-v2/19-marketing-strategy.png'),
  'marketing-strategy': require('../assets/images/tool-icons-v2/6---marketing-strategy.png'),
  'marketing-campaign': require('../assets/images/tool-icons-v2/25-marketing-campaign.png'),
  'marketing-target': require('../assets/images/tool-icons-v2/10.-marketing-target.png'),
  'promotion': require('../assets/images/tool-icons-v2/4---promotion.png'),
  'advertisement': require('../assets/images/tool-icons-v2/27-advertisement.png'),
  'conversion': require('../assets/images/tool-icons-v2/26-conversion-rate.png'),
  'ab-testing': require('../assets/images/tool-icons-v2/20---ab-testing.png'),
  'landing-page': require('../assets/images/tool-icons-v2/18-landing-page.png'),
  'hashtag': require('../assets/images/tool-icons-v2/7---hashtag.png'),
  'internet-marketing': require('../assets/images/tool-icons-v2/24-internet-marketing.png'),
  'promotions': require('../assets/images/tool-icons-v2/22-promotions.png'),

  // === Content & Copywriting ===
  'content': require('../assets/images/tool-icons-v2/15---content-marketing.png'),
  'copywriting': require('../assets/images/tool-icons-v2/7-copywriting.png'),
  'content-marketing': require('../assets/images/tool-icons-v2/15---content-marketing.png'),
  'optimized-content': require('../assets/images/tool-icons-v2/8-optimized-content.png'),
  'presentation': require('../assets/images/tool-icons-v2/3---presentation.png'),
  'blog': require('../assets/images/tool-icons-v2/11---copywriting.png'),

  // === Email ===
  'email': require('../assets/images/tool-icons-v2/2---email-marketing.png'),
  'email-marketing': require('../assets/images/tool-icons-v2/2---email-marketing.png'),
  'email-campaign': require('../assets/images/tool-icons-v2/2.-email-campaign.png'),

  // === Social Media ===
  'social': require('../assets/images/tool-icons-v2/13---social-media-engagement.png'),
  'social-media': require('../assets/images/tool-icons-v2/13---social-media-engagement.png'),
  'facebook': require('../assets/images/tool-icons-v2/01_facebook.png'),
  'meta': require('../assets/images/tool-icons-v2/01_facebook.png'),
  'instagram': require('../assets/images/tool-icons-v2/02_instagram.png'),
  'twitter': require('../assets/images/tool-icons-v2/03_x.png'),
  'x': require('../assets/images/tool-icons-v2/03_x.png'),
  'linkedin': require('../assets/images/tool-icons-v2/04_linkedin.png'),
  'youtube': require('../assets/images/tool-icons-v2/05_youtube.png'),
  'whatsapp': require('../assets/images/tool-icons-v2/06_whatsapp.png'),
  'reddit': require('../assets/images/tool-icons-v2/07_reddit.png'),
  'tumblr': require('../assets/images/tool-icons-v2/08_tumblr.png'),
  'snapchat': require('../assets/images/tool-icons-v2/09_snapchat.png'),
  'tiktok': require('../assets/images/tool-icons-v2/11_tiktok.png'),
  'pinterest': require('../assets/images/tool-icons-v2/10_pinterest.png'),
  'telegram': require('../assets/images/tool-icons-v2/24_telegram.png'),
  'discord': require('../assets/images/tool-icons-v2/21_discord.png'),
  'slack': require('../assets/images/tool-icons-v2/30_slack.png'),

  // === E-commerce ===
  'ecommerce': require('../assets/images/tool-icons-v2/ecommerce.png'),
  'shopify': require('../assets/images/tool-icons-v2/desktop-shop.png'),
  'product': require('../assets/images/tool-icons-v2/shopping-bag.png'),
  'cart': require('../assets/images/tool-icons-v2/shopping-cart.png'),
  'store': require('../assets/images/tool-icons-v2/6.-store.png'),
  'payment': require('../assets/images/tool-icons-v2/payment.png'),
  'price': require('../assets/images/tool-icons-v2/price-tag.png'),
  'sale': require('../assets/images/tool-icons-v2/sale.png'),
  'discount': require('../assets/images/tool-icons-v2/discount.png'),
  'delivery': require('../assets/images/tool-icons-v2/fast-delivery.png'),
  'shipping': require('../assets/images/tool-icons-v2/worldwide-shipping.png'),

  // === Data & Analytics ===
  'data': require('../assets/images/tool-icons-v2/1---data-analytic.png'),
  'data-analytic': require('../assets/images/tool-icons-v2/1---data-analytic.png'),
  'market-analysis': require('../assets/images/tool-icons-v2/18---market-analysis.png'),
  'sales-analytics': require('../assets/images/tool-icons-v2/sales-analytics.png'),
  'feedback': require('../assets/images/tool-icons-v2/14---feedback.png'),
  'review': require('../assets/images/tool-icons-v2/review.png'),
  'rating': require('../assets/images/tool-icons-v2/rating.png'),

  // === Ads / PPC ===
  'ads': require('../assets/images/tool-icons-v2/12.-mobile-ads.png'),
  'ppc': require('../assets/images/tool-icons-v2/20.-pay-per-click.png'),
  'google': require('../assets/images/tool-icons-v2/17_google.png'),
  'google-ads': require('../assets/images/tool-icons-v2/20.-pay-per-click.png'),
  'video-ads': require('../assets/images/tool-icons-v2/9.-video-ads.png'),
  'online-ads': require('../assets/images/tool-icons-v2/6.-online-ads2.png'),
  'mobile-ads': require('../assets/images/tool-icons-v2/12.-mobile-ads.png'),

  // === Tech & Cloud ===
  'cloud': require('../assets/images/tool-icons-v2/cloud.png'),
  'server': require('../assets/images/tool-icons-v2/server.png'),
  'security': require('../assets/images/tool-icons-v2/5---internet-security.png'),
  'mobile': require('../assets/images/tool-icons-v2/22---mobile-optimization.png'),
  'web': require('../assets/images/tool-icons-v2/1.-web-report.png'),
  'api': require('../assets/images/tool-icons-v2/servers.png'),
  'domain': require('../assets/images/tool-icons-v2/23-domain.png'),
  'notification': require('../assets/images/tool-icons-v2/notification-promo.png'),
  'calendar': require('../assets/images/tool-icons-v2/calendar.png'),
  'chat': require('../assets/images/tool-icons-v2/chat.png'),
  'camera': require('../assets/images/tool-icons-v2/camera.png'),
  'video': require('../assets/images/tool-icons-v2/video_player.png'),
  'file': require('../assets/images/tool-icons-v2/file-manager.png'),
  'contact': require('../assets/images/tool-icons-v2/contact.png'),
  'setting': require('../assets/images/tool-icons-v2/setting.png'),

  // === Team & People ===
  'team': require('../assets/images/tool-icons-v2/20-seo-team.png'),
  'marketing-team': require('../assets/images/tool-icons-v2/21-marketing-team.png'),
  'customer': require('../assets/images/tool-icons-v2/13.-customer-engagement.png'),
  'lead': require('../assets/images/tool-icons-v2/15.-lead-magnet.png'),
  'user': require('../assets/images/tool-icons-v2/5.-user-targeting2.png'),
  'audience': require('../assets/images/tool-icons-v2/14.-customer-network.png'),

  // === Creative ===
  'meme': require('../assets/images/tool-icons-v2/game.png'),
  'image': require('../assets/images/tool-icons-v2/gallery.png'),
  'design': require('../assets/images/tool-icons-v2/screen.png'),
  'brand': require('../assets/images/tool-icons-v2/badge-discount.png'),
};

const DEFAULT_ICON = require('../assets/images/tool-icons-v2/19-marketing-strategy.png');

export function getToolIcon(slug: string, category?: string): any {
  const normalized = slug.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  if (ToolIconImages[normalized]) return ToolIconImages[normalized];

  if (category) {
    const catKey = category.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (ToolIconImages[catKey]) return ToolIconImages[catKey];
  }

  const keys = Object.keys(ToolIconImages);
  for (const key of keys) {
    if (normalized.includes(key) && key.length > 3) return ToolIconImages[key];
  }

  const parts = normalized.split('-').filter(p => p.length > 3);
  for (const key of keys) {
    if (parts.some(p => key.includes(p))) return ToolIconImages[key];
  }

  return DEFAULT_ICON;
}
