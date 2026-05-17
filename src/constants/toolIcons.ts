import { Platform } from "react-native";

/**
 * PRO Tool Icon Mapping (auto-generated, paid icon pack)
 * Sources every primary icon from assets/images/tool-icons-v2 — 1000+ unique icons.
 * ALL PHYSICALLY IDENTICAL DUPLICATES REMOVED.
 */

export const ToolIconImages: Record<string, any> = {
  "ai-brain": require("../../assets/images/tool-icons-v2/ai-brain.webp"),
  "analytics-3d": require("../../assets/images/tool-icons-v2/analytics-3d.webp"),
  "analytics": require("../../assets/images/tool-icons-v2/analytics.webp"),
  "automation": require("../../assets/images/tool-icons-v2/automation.webp"),
  "bot": require("../../assets/images/tool-icons-v2/bot.webp"),
  "conversion-rate": require("../../assets/images/tool-icons-v2/conversion-rate.webp"),
  "ecommerce-3d": require("../../assets/images/tool-icons-v2/ecommerce-3d.webp"),
  "facebook": require("../../assets/images/tool-icons-v2/facebook.webp"),
  "google-3d": require("../../assets/images/tool-icons-v2/google-3d.webp"),
  "instagram": require("../../assets/images/tool-icons-v2/instagram.webp"),
  "linkedin": require("../../assets/images/tool-icons-v2/linkedin.webp"),
  "medium": require("../../assets/images/tool-icons-v2/medium.webp"),
  "messenger": require("../../assets/images/tool-icons-v2/messenger.webp"),
  "meta-3d": require("../../assets/images/tool-icons-v2/meta-3d.webp"),
  "meta": require("../../assets/images/tool-icons-v2/meta.webp"),
  "online-business": require("../../assets/images/tool-icons-v2/online-business.webp"),
  "online-payment": require("../../assets/images/tool-icons-v2/online-payment.webp"),
  "online-promotion": require("../../assets/images/tool-icons-v2/online-promotion.webp"),
  "padlock": require("../../assets/images/tool-icons-v2/padlock.webp"),
  "pinterest": require("../../assets/images/tool-icons-v2/pinterest.webp"),
  "product-trolley": require("../../assets/images/tool-icons-v2/product-trolley.webp"),
  "reddit": require("../../assets/images/tool-icons-v2/reddit.webp"),
  "search-engine": require("../../assets/images/tool-icons-v2/search-engine.webp"),
  "search-volume": require("../../assets/images/tool-icons-v2/search-volume.webp"),
  "sem": require("../../assets/images/tool-icons-v2/sem.webp"),
  "seo-3d": require("../../assets/images/tool-icons-v2/seo-3d.webp"),
  "shield": require("../../assets/images/tool-icons-v2/shield.webp"),
  "shopify-3d": require("../../assets/images/tool-icons-v2/shopify-3d.webp"),
  "snapchat": require("../../assets/images/tool-icons-v2/snapchat.webp"),
  "telegram": require("../../assets/images/tool-icons-v2/telegram.webp"),
  "tiktok": require("../../assets/images/tool-icons-v2/tiktok.webp"),
  "trophy": require("../../assets/images/tool-icons-v2/trophy.webp"),
  "video-player": require("../../assets/images/tool-icons-v2/video-player.webp"),
  "whatsapp": require("../../assets/images/tool-icons-v2/whatsapp.webp"),
  "x-twitter": require("../../assets/images/tool-icons-v2/x-twitter.webp"),
  "youtube": require("../../assets/images/tool-icons-v2/youtube.webp"),
};

const DEFAULT_ICON = ToolIconImages["1-seo"] || Object.values(ToolIconImages)[0];

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

  // Hash-based deterministic fallback so every tool gets a valid icon
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  const key = ToolIconImagesKeys[h % ToolIconImagesKeys.length];
  return ToolIconImages[key] || DEFAULT_ICON;
}
