import { create } from 'zustand';
import { Models } from 'react-native-appwrite';
import { dbService, COLLECTIONS, Query } from '../services/appwrite';
import { generateAIContent } from '../services/aiService';
import { googleAdsDirect } from '../services/googleAdsDirect';
import { metaAdsDirect } from '../services/metaAdsDirect';
import { googleAnalyticsDirect } from '../services/googleAnalyticsDirect';
import { loadAllTools } from '../data/toolsLoader';

// Load all 314 tools from web app data
const ALL_TOOLS = loadAllTools();

export interface Tool {
  $id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  icon: string;
  category: string;
  subcategory?: string;
  isPro: boolean;
  isNew: boolean;
  isTrending: boolean;
  usageCount: number;
  rating: number;
  inputs: ToolInput[];
  outputType: 'text' | 'image' | 'code' | 'html';
  exampleOutput?: string;
  tags: string[];
}

export interface ToolInput {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'number' | 'toggle';
  placeholder?: string;
  required: boolean;
  options?: string[];
  defaultValue?: string | number | boolean;
  maxLength?: number;
  helperText?: string;
}

export interface Generation {
  $id: string;
  userId: string;
  toolId: string;
  toolName: string;
  input: Record<string, any>;
  output: string;
  outputType: 'text' | 'image' | 'code' | 'html';
  createdAt: string;
  isFavorite: boolean;
}

interface ToolsState {
  tools: Tool[];
  categories: string[];
  featuredTools: Tool[];
  recentTools: Tool[];
  favoriteTools: Tool[];
  generations: Generation[];
  selectedTool: Tool | null;
  isLoading: boolean;
  isGenerating: boolean;
  error: string | null;

  // Actions
  fetchTools: () => Promise<void>;
  fetchToolBySlug: (slug: string) => Promise<Tool | null>;
  fetchGenerations: (userId: string) => Promise<void>;
  addGeneration: (generation: Omit<Generation, '$id'>) => Promise<void>;
  toggleFavorite: (generationId: string) => Promise<void>;
  setSelectedTool: (tool: Tool | null) => void;
  searchTools: (query: string) => Tool[];
  getToolsByCategory: (category: string) => Tool[];
  generateContent: (toolId: string, inputs: Record<string, any>) => Promise<any>;
  deleteGeneration: (generationId: string) => Promise<void>;
}

// Slugs that trigger real data fetching (Governance Ready)
const REAL_DATA_TOOLS = {
  GOOGLE_ADS: ['google-ads-grader', 'ads-grader-pro', 'google-ads-performance-grader'],
  META_ADS: ['facebook-ads-performance-grader', 'meta-ads-grader'],
  ANALYTICS: ['ga4-reports', 'ga4-grader', 'website-grader'],
};

// 3 Main Platforms
export const PLATFORMS = [
  { id: 'google', name: 'Google Ads', icon: 'search', color: '#4285F4' },
  { id: 'meta', name: 'Meta/Facebook', icon: 'facebook', color: '#1877F2' },
  { id: 'shopify', name: 'Shopify/E-commerce', icon: 'shopping-bag', color: '#96BF48' },
];

// AI Tool Categories (matching web app)
export const TOOL_CATEGORIES = [
  // Google Platform Categories
  { id: 'google-ads', name: 'Google Ads', icon: 'target', platform: 'google' },
  { id: 'google-seo', name: 'Google SEO', icon: 'search', platform: 'google' },
  { id: 'google-analytics', name: 'Analytics', icon: 'bar-chart-2', platform: 'google' },
  { id: 'google-content', name: 'Content & Blogs', icon: 'file-text', platform: 'google' },
  // Meta/Facebook Platform Categories
  { id: 'facebook-ads', name: 'Facebook Ads', icon: 'target', platform: 'meta' },
  { id: 'instagram', name: 'Instagram', icon: 'instagram', platform: 'meta' },
  { id: 'social-media', name: 'Social Media', icon: 'share-2', platform: 'meta' },
  { id: 'meta-content', name: 'Content Creator', icon: 'edit-3', platform: 'meta' },
  // Shopify/E-commerce Platform Categories
  { id: 'shopify-products', name: 'Product Listings', icon: 'shopping-bag', platform: 'shopify' },
  { id: 'shopify-ads', name: 'Shopping Ads', icon: 'target', platform: 'shopify' },
  { id: 'email-marketing', name: 'Email Marketing', icon: 'mail', platform: 'shopify' },
  { id: 'ecommerce-seo', name: 'E-commerce SEO', icon: 'search', platform: 'shopify' },
  // TikTok
  { id: 'tiktok', name: 'TikTok', icon: 'video', platform: 'meta' },
  // YouTube
  { id: 'youtube', name: 'YouTube', icon: 'youtube', platform: 'meta' },
  // LinkedIn
  { id: 'linkedin', name: 'LinkedIn', icon: 'linkedin', platform: 'meta' },
  // Twitter/X
  { id: 'twitter', name: 'Twitter/X', icon: 'twitter', platform: 'meta' },
  // Pinterest
  { id: 'pinterest', name: 'Pinterest', icon: 'image', platform: 'meta' },
  // AI Marketing Agents (All Platforms)
  { id: 'ai-agents', name: 'AI Marketing Agents', icon: 'cpu', platform: 'all' },
  // Content Creation Tools
  { id: 'content-creation', name: 'Content Creation', icon: 'edit', platform: 'all' },
  // Copywriting Tools
  { id: 'copywriting', name: 'Copywriting', icon: 'edit-3', platform: 'all' },
];

// AI Marketing Tools across 3 Platforms
const TOOLS: Tool[] = [
  // ===== GOOGLE PLATFORM TOOLS =====
  // Google Ads Category
  { $id: 'g1', name: 'Google Ads Headline', slug: 'google-ads-headline', shortDescription: 'Create compelling Google Ads headlines', description: 'Generate high-CTR headlines for Google Search and Display ads.', icon: 'type', category: 'google-ads', isPro: false, isNew: false, isTrending: true, usageCount: 15200, rating: 4.9, inputs: [{ name: 'product', label: 'Product/Service', type: 'text', required: true }, { name: 'keywords', label: 'Target Keywords', type: 'text', required: true }], outputType: 'text', tags: ['google', 'ads', 'headlines'] },
  { $id: 'g2', name: 'Google Ads Description', slug: 'google-ads-description', shortDescription: 'Write Google Ads descriptions', description: 'Create persuasive ad descriptions that convert.', icon: 'align-left', category: 'google-ads', isPro: false, isNew: false, isTrending: true, usageCount: 12800, rating: 4.8, inputs: [{ name: 'headline', label: 'Ad Headline', type: 'text', required: true }, { name: 'offer', label: 'Your Offer', type: 'textarea', required: true }], outputType: 'text', tags: ['google', 'ads', 'copy'] },
  { $id: 'g3', name: 'Google Performance Max', slug: 'google-pmax', shortDescription: 'Performance Max ad assets', description: 'Generate complete asset groups for Performance Max campaigns.', icon: 'zap', category: 'google-ads', isPro: true, isNew: true, isTrending: true, usageCount: 8900, rating: 4.7, inputs: [{ name: 'business', label: 'Business Description', type: 'textarea', required: true }], outputType: 'text', tags: ['google', 'pmax', 'automation'] },
  { $id: 'g4', name: 'Google Display Ads', slug: 'google-display-copy', shortDescription: 'Display network ad copy', description: 'Create engaging copy for Google Display Network.', icon: 'image', category: 'google-ads', isPro: false, isNew: false, isTrending: false, usageCount: 6700, rating: 4.6, inputs: [{ name: 'product', label: 'Product', type: 'text', required: true }], outputType: 'text', tags: ['google', 'display', 'ads'] },
  { $id: 'g5', name: 'Google Shopping Feed', slug: 'google-shopping-feed', shortDescription: 'Optimize product feeds', description: 'Enhance product titles and descriptions for Google Shopping.', icon: 'shopping-cart', category: 'google-ads', isPro: true, isNew: false, isTrending: true, usageCount: 9200, rating: 4.8, inputs: [{ name: 'productTitle', label: 'Current Title', type: 'text', required: true }, { name: 'features', label: 'Features', type: 'textarea', required: true }], outputType: 'text', tags: ['shopping', 'feed', 'products'] },
  { $id: 'g6', name: 'Google Responsive Ads', slug: 'google-rsa', shortDescription: 'RSA headline & description sets', description: 'Generate 15 headlines and 4 descriptions for RSA.', icon: 'layers', category: 'google-ads', isPro: false, isNew: false, isTrending: true, usageCount: 11500, rating: 4.9, inputs: [{ name: 'business', label: 'Business', type: 'text', required: true }], outputType: 'text', tags: ['google', 'rsa', 'responsive'] },
  { $id: 'g7', name: 'Google Ad Extensions', slug: 'google-extensions', shortDescription: 'Sitelinks & callouts', description: 'Create compelling ad extensions for better CTR.', icon: 'plus-square', category: 'google-ads', isPro: false, isNew: false, isTrending: false, usageCount: 5400, rating: 4.5, inputs: [{ name: 'website', label: 'Website URL', type: 'text', required: true }], outputType: 'text', tags: ['extensions', 'sitelinks'] },
  { $id: 'g8', name: 'Google Keyword AI', slug: 'google-keyword-ai', shortDescription: 'AI keyword suggestions', description: 'Discover high-intent keywords with AI analysis.', icon: 'key', category: 'google-ads', isPro: true, isNew: true, isTrending: true, usageCount: 7800, rating: 4.7, inputs: [{ name: 'seed', label: 'Seed Keywords', type: 'text', required: true }], outputType: 'text', tags: ['keywords', 'research'] },
  { $id: 'g16', name: 'Negative Keywords Finder', slug: 'negative-keywords', shortDescription: 'Find wasted spend keywords', description: 'AI identifies negative keywords to reduce wasted ad spend.', icon: 'minus-circle', category: 'google-ads', isPro: true, isNew: false, isTrending: true, usageCount: 6300, rating: 4.7, inputs: [{ name: 'campaign', label: 'Campaign Theme', type: 'text', required: true }], outputType: 'text', tags: ['google', 'keywords', 'negative'] },
  { $id: 'g17', name: 'Ad Group Builder', slug: 'ad-group-builder', shortDescription: 'Structure ad groups', description: 'Create tightly themed ad groups with keywords and ads.', icon: 'folder', category: 'google-ads', isPro: false, isNew: false, isTrending: false, usageCount: 4800, rating: 4.5, inputs: [{ name: 'product', label: 'Product/Service', type: 'text', required: true }], outputType: 'text', tags: ['google', 'ads', 'structure'] },
  { $id: 'g18', name: 'Google Video Ads Script', slug: 'google-video-script', shortDescription: 'YouTube video ad scripts', description: 'Create compelling scripts for YouTube and Google Video ads.', icon: 'video', category: 'google-ads', isPro: true, isNew: true, isTrending: true, usageCount: 5200, rating: 4.6, inputs: [{ name: 'product', label: 'Product', type: 'text', required: true }, { name: 'duration', label: 'Duration', type: 'select', required: true, options: ['15s', '30s', '60s'] }], outputType: 'text', tags: ['google', 'video', 'youtube'] },
  { $id: 'g19', name: 'Landing Page Copy', slug: 'landing-page-copy', shortDescription: 'High-converting landing pages', description: 'Generate landing page copy that matches your Google Ads.', icon: 'layout', category: 'google-ads', isPro: true, isNew: false, isTrending: true, usageCount: 7100, rating: 4.8, inputs: [{ name: 'headline', label: 'Ad Headline', type: 'text', required: true }, { name: 'offer', label: 'Offer Details', type: 'textarea', required: true }], outputType: 'text', tags: ['landing', 'copy', 'conversion'] },
  { $id: 'g20', name: 'Quality Score Booster', slug: 'quality-score-booster', shortDescription: 'Improve ad quality score', description: 'Get AI recommendations to boost your Google Ads Quality Score.', icon: 'award', category: 'google-ads', isPro: true, isNew: false, isTrending: false, usageCount: 3900, rating: 4.6, inputs: [{ name: 'keyword', label: 'Keyword', type: 'text', required: true }, { name: 'adCopy', label: 'Current Ad Copy', type: 'textarea', required: true }], outputType: 'text', tags: ['quality', 'score', 'optimization'] },
  { $id: 'g21', name: 'Call-Only Ads', slug: 'call-only-ads', shortDescription: 'Phone call ad copy', description: 'Create compelling call-only ad campaigns.', icon: 'phone', category: 'google-ads', isPro: false, isNew: false, isTrending: false, usageCount: 2800, rating: 4.4, inputs: [{ name: 'business', label: 'Business', type: 'text', required: true }], outputType: 'text', tags: ['google', 'call', 'ads'] },
  { $id: 'g22', name: 'Discovery Ads Copy', slug: 'discovery-ads', shortDescription: 'Google Discovery campaigns', description: 'Create visual and text assets for Discovery campaigns.', icon: 'compass', category: 'google-ads', isPro: true, isNew: true, isTrending: false, usageCount: 3100, rating: 4.5, inputs: [{ name: 'product', label: 'Product', type: 'text', required: true }], outputType: 'text', tags: ['discovery', 'google', 'visual'] },
  { $id: 'g23', name: 'Remarketing Ad Copy', slug: 'remarketing-copy', shortDescription: 'Re-engage past visitors', description: 'Write remarketing ads that bring back website visitors.', icon: 'refresh-cw', category: 'google-ads', isPro: false, isNew: false, isTrending: true, usageCount: 5600, rating: 4.7, inputs: [{ name: 'product', label: 'Product', type: 'text', required: true }], outputType: 'text', tags: ['remarketing', 'retargeting'] },
  { $id: 'g24', name: 'App Install Ads', slug: 'app-install-ads', shortDescription: 'App promotion campaigns', description: 'Create app install campaign copy for Google UAC.', icon: 'smartphone', category: 'google-ads', isPro: true, isNew: false, isTrending: false, usageCount: 2400, rating: 4.4, inputs: [{ name: 'appName', label: 'App Name', type: 'text', required: true }], outputType: 'text', tags: ['app', 'install', 'uac'] },
  // Google SEO Category
  { $id: 'g9', name: 'SEO Meta Title', slug: 'seo-meta-title', shortDescription: 'Optimized meta titles', description: 'Generate SEO-friendly meta titles under 60 characters.', icon: 'hash', category: 'google-seo', isPro: false, isNew: false, isTrending: true, usageCount: 14200, rating: 4.8, inputs: [{ name: 'page', label: 'Page Topic', type: 'text', required: true }, { name: 'keyword', label: 'Target Keyword', type: 'text', required: true }], outputType: 'text', tags: ['seo', 'meta', 'titles'] },
  { $id: 'g10', name: 'SEO Meta Description', slug: 'seo-meta-description', shortDescription: 'Compelling meta descriptions', description: 'Create click-worthy meta descriptions with keywords.', icon: 'file-text', category: 'google-seo', isPro: false, isNew: false, isTrending: true, usageCount: 13800, rating: 4.8, inputs: [{ name: 'title', label: 'Page Title', type: 'text', required: true }], outputType: 'text', tags: ['seo', 'meta', 'descriptions'] },
  { $id: 'g11', name: 'SEO Blog Writer', slug: 'seo-blog-writer', shortDescription: 'SEO-optimized blog posts', description: 'Generate long-form SEO content with proper structure.', icon: 'book-open', category: 'google-seo', isPro: true, isNew: false, isTrending: true, usageCount: 11200, rating: 4.9, inputs: [{ name: 'topic', label: 'Blog Topic', type: 'text', required: true }, { name: 'keywords', label: 'Keywords', type: 'text', required: false }], outputType: 'text', tags: ['blog', 'seo', 'content'] },
  { $id: 'g12', name: 'Schema Markup', slug: 'schema-markup', shortDescription: 'Structured data markup', description: 'Generate JSON-LD schema for rich snippets.', icon: 'code', category: 'google-seo', isPro: true, isNew: false, isTrending: false, usageCount: 4500, rating: 4.6, inputs: [{ name: 'type', label: 'Schema Type', type: 'select', required: true, options: ['Article', 'Product', 'LocalBusiness', 'FAQ'] }], outputType: 'code', tags: ['schema', 'structured-data'] },
  { $id: 'g13', name: 'Internal Link Ideas', slug: 'internal-links', shortDescription: 'Smart internal link ideas', description: 'AI-powered internal linking recommendations.', icon: 'link', category: 'google-seo', isPro: true, isNew: true, isTrending: false, usageCount: 3200, rating: 4.5, inputs: [{ name: 'content', label: 'Your Content', type: 'textarea', required: true }], outputType: 'text', tags: ['links', 'seo'] },
  { $id: 'g25', name: 'Backlink Outreach Email', slug: 'backlink-outreach', shortDescription: 'Link building emails', description: 'Create persuasive outreach emails for backlink acquisition.', icon: 'mail', category: 'google-seo', isPro: true, isNew: false, isTrending: true, usageCount: 5800, rating: 4.6, inputs: [{ name: 'website', label: 'Your Website', type: 'text', required: true }, { name: 'target', label: 'Target Site', type: 'text', required: true }], outputType: 'text', tags: ['backlinks', 'outreach', 'seo'] },
  { $id: 'g26', name: 'Content Brief Generator', slug: 'content-brief', shortDescription: 'SEO content briefs', description: 'Generate detailed content briefs with keyword targets and structure.', icon: 'clipboard', category: 'google-seo', isPro: true, isNew: false, isTrending: true, usageCount: 6200, rating: 4.7, inputs: [{ name: 'keyword', label: 'Primary Keyword', type: 'text', required: true }], outputType: 'text', tags: ['brief', 'content', 'seo'] },
  { $id: 'g27', name: 'FAQ Generator', slug: 'faq-generator', shortDescription: 'SEO FAQ sections', description: 'Generate FAQ sections optimized for featured snippets.', icon: 'help-circle', category: 'google-seo', isPro: false, isNew: false, isTrending: true, usageCount: 7400, rating: 4.7, inputs: [{ name: 'topic', label: 'Topic', type: 'text', required: true }], outputType: 'text', tags: ['faq', 'seo', 'snippets'] },
  { $id: 'g28', name: 'Alt Text Writer', slug: 'alt-text-writer', shortDescription: 'Image alt text', description: 'Generate SEO-friendly alt text for images.', icon: 'image', category: 'google-seo', isPro: false, isNew: false, isTrending: false, usageCount: 3100, rating: 4.4, inputs: [{ name: 'image', label: 'Image Description', type: 'text', required: true }], outputType: 'text', tags: ['alt', 'images', 'seo'] },
  { $id: 'g29', name: 'URL Slug Optimizer', slug: 'url-slug-optimizer', shortDescription: 'SEO-friendly URLs', description: 'Create optimized URL slugs for better rankings.', icon: 'link-2', category: 'google-seo', isPro: false, isNew: false, isTrending: false, usageCount: 2600, rating: 4.3, inputs: [{ name: 'title', label: 'Page Title', type: 'text', required: true }], outputType: 'text', tags: ['url', 'slug', 'seo'] },
  { $id: 'g30', name: 'Competitor Analysis', slug: 'competitor-analysis', shortDescription: 'Analyze competitor content', description: 'AI-powered competitor content gap analysis.', icon: 'eye', category: 'google-seo', isPro: true, isNew: true, isTrending: true, usageCount: 4900, rating: 4.8, inputs: [{ name: 'competitor', label: 'Competitor URL', type: 'text', required: true }], outputType: 'text', tags: ['competitor', 'analysis', 'seo'] },
  { $id: 'g31', name: 'Local SEO Content', slug: 'local-seo-content', shortDescription: 'Local business SEO', description: 'Create location-specific content for local SEO.', icon: 'map-pin', category: 'google-seo', isPro: false, isNew: false, isTrending: true, usageCount: 5100, rating: 4.6, inputs: [{ name: 'business', label: 'Business Name', type: 'text', required: true }, { name: 'location', label: 'Location', type: 'text', required: true }], outputType: 'text', tags: ['local', 'seo', 'business'] },
  { $id: 'g32', name: 'Heading Structure', slug: 'heading-structure', shortDescription: 'H1-H6 hierarchy', description: 'Generate optimized heading structure for any page.', icon: 'list', category: 'google-seo', isPro: false, isNew: false, isTrending: false, usageCount: 3400, rating: 4.5, inputs: [{ name: 'topic', label: 'Page Topic', type: 'text', required: true }], outputType: 'text', tags: ['headings', 'structure', 'seo'] },
  // Google Analytics Category
  { $id: 'g14', name: 'GA4 Reports', slug: 'ga4-reports', shortDescription: 'Analytics insights', description: 'Generate actionable insights from your GA4 data.', icon: 'bar-chart-2', category: 'google-analytics', isPro: true, isNew: true, isTrending: true, usageCount: 6700, rating: 4.7, inputs: [{ name: 'propertyId', label: 'GA4 Property ID', type: 'text', required: true }], outputType: 'text', tags: ['analytics', 'ga4', 'reports'] },
  { $id: 'g15', name: 'Ads Performance Grader', slug: 'ads-grader-pro', shortDescription: 'Analyze ad performance', description: 'Get AI recommendations to improve your Google Ads.', icon: 'trending-up', category: 'google-analytics', isPro: false, isNew: false, isTrending: true, usageCount: 8900, rating: 4.8, inputs: [{ name: 'customerId', label: 'Google Ads Customer ID', type: 'text', required: true }], outputType: 'text', tags: ['grader', 'analysis'] },
  { $id: 'g33', name: 'Conversion Tracker Setup', slug: 'conversion-tracker', shortDescription: 'Track conversions', description: 'Generate conversion tracking code and setup instructions.', icon: 'check-circle', category: 'google-analytics', isPro: true, isNew: false, isTrending: false, usageCount: 3800, rating: 4.5, inputs: [{ name: 'goal', label: 'Conversion Goal', type: 'select', required: true, options: ['Purchase', 'Lead Form', 'Phone Call', 'Sign Up'] }], outputType: 'code', tags: ['conversion', 'tracking', 'analytics'] },
  { $id: 'g34', name: 'UTM Builder', slug: 'utm-builder', shortDescription: 'Campaign URL tagging', description: 'Generate UTM-tagged URLs for campaign tracking.', icon: 'link', category: 'google-analytics', isPro: false, isNew: false, isTrending: false, usageCount: 4200, rating: 4.4, inputs: [{ name: 'url', label: 'Landing Page URL', type: 'text', required: true }, { name: 'campaign', label: 'Campaign Name', type: 'text', required: true }], outputType: 'text', tags: ['utm', 'tracking', 'urls'] },
  { $id: 'g35', name: 'Website Speed Report', slug: 'website-speed-report', shortDescription: 'Page speed insights', description: 'Get AI recommendations to improve website performance.', icon: 'activity', category: 'google-analytics', isPro: true, isNew: true, isTrending: true, usageCount: 3500, rating: 4.6, inputs: [{ name: 'url', label: 'Website URL', type: 'text', required: true }], outputType: 'text', tags: ['speed', 'performance', 'web'] },
  // Google Content Category
  { $id: 'g36', name: 'Blog Post Outline', slug: 'blog-post-outline', shortDescription: 'Structured blog outlines', description: 'Generate detailed blog post outlines with sections and talking points.', icon: 'file-text', category: 'google-content', isPro: false, isNew: false, isTrending: true, usageCount: 9800, rating: 4.8, inputs: [{ name: 'topic', label: 'Blog Topic', type: 'text', required: true }], outputType: 'text', tags: ['blog', 'outline', 'content'] },
  { $id: 'g37', name: 'Article Rewriter', slug: 'article-rewriter', shortDescription: 'Rewrite content uniquely', description: 'Rewrite existing articles while maintaining meaning and SEO value.', icon: 'refresh-cw', category: 'google-content', isPro: false, isNew: false, isTrending: true, usageCount: 8200, rating: 4.7, inputs: [{ name: 'content', label: 'Original Content', type: 'textarea', required: true }], outputType: 'text', tags: ['rewrite', 'content', 'unique'] },
  { $id: 'g38', name: 'Press Release Writer', slug: 'press-release', shortDescription: 'Professional press releases', description: 'Create newsworthy press releases for media distribution.', icon: 'radio', category: 'google-content', isPro: true, isNew: false, isTrending: false, usageCount: 3200, rating: 4.5, inputs: [{ name: 'news', label: 'News/Announcement', type: 'textarea', required: true }], outputType: 'text', tags: ['press', 'release', 'media'] },
  { $id: 'g39', name: 'Google Business Post', slug: 'gbp-post', shortDescription: 'Google Business Profile posts', description: 'Create engaging posts for Google Business Profile.', icon: 'map-pin', category: 'google-content', isPro: false, isNew: true, isTrending: true, usageCount: 4100, rating: 4.6, inputs: [{ name: 'business', label: 'Business Type', type: 'text', required: true }, { name: 'offer', label: 'Offer/Update', type: 'text', required: true }], outputType: 'text', tags: ['gbp', 'local', 'posts'] },
  { $id: 'g40', name: 'Newsletter Writer', slug: 'newsletter-writer', shortDescription: 'Email newsletter content', description: 'Generate engaging newsletter content for your subscribers.', icon: 'mail', category: 'google-content', isPro: false, isNew: false, isTrending: true, usageCount: 6700, rating: 4.7, inputs: [{ name: 'topic', label: 'Newsletter Topic', type: 'text', required: true }], outputType: 'text', tags: ['newsletter', 'email', 'content'] },

  // ===== META/FACEBOOK PLATFORM TOOLS =====
  // Facebook Ads Category
  { $id: 'm1', name: 'Facebook Ad Copy', slug: 'facebook-ad-copy', shortDescription: 'High-converting FB ads', description: 'Create scroll-stopping Facebook ad copy.', icon: 'facebook', category: 'facebook-ads', isPro: false, isNew: false, isTrending: true, usageCount: 18500, rating: 4.9, inputs: [{ name: 'product', label: 'Product', type: 'text', required: true }, { name: 'audience', label: 'Target Audience', type: 'text', required: true }], outputType: 'text', tags: ['facebook', 'ads', 'copy'] },
  { $id: 'm2', name: 'Facebook Ads Grader', slug: 'facebook-ads-performance-grader', shortDescription: 'Grade FB Ads performance', description: 'AI grading of your Facebook Ads with improvement tips.', icon: 'facebook', category: 'facebook-ads', isPro: false, isNew: false, isTrending: true, usageCount: 9200, rating: 4.7, inputs: [{ name: 'adAccountId', label: 'Meta Ad Account ID', type: 'text', required: true }], outputType: 'text', tags: ['facebook', 'performance', 'grader'] },
  { $id: 'm3', name: 'Facebook Carousel Ads', slug: 'fb-carousel-ads', shortDescription: 'Multi-card carousel copy', description: 'Create compelling carousel ad cards for Facebook.', icon: 'columns', category: 'facebook-ads', isPro: false, isNew: false, isTrending: true, usageCount: 7800, rating: 4.7, inputs: [{ name: 'product', label: 'Product', type: 'text', required: true }, { name: 'cards', label: 'Number of Cards', type: 'select', required: true, options: ['3', '5', '10'] }], outputType: 'text', tags: ['facebook', 'carousel', 'ads'] },
  { $id: 'm4', name: 'Facebook Lead Ad Form', slug: 'fb-lead-ad', shortDescription: 'Lead generation ads', description: 'Create lead generation ad copy with form suggestions.', icon: 'user-plus', category: 'facebook-ads', isPro: true, isNew: false, isTrending: true, usageCount: 6400, rating: 4.6, inputs: [{ name: 'offer', label: 'Lead Magnet/Offer', type: 'text', required: true }], outputType: 'text', tags: ['facebook', 'leads', 'forms'] },
  { $id: 'm5', name: 'Facebook Video Ad Script', slug: 'fb-video-script', shortDescription: 'Video ad scripts', description: 'Write engaging video ad scripts for Facebook and Reels.', icon: 'video', category: 'facebook-ads', isPro: true, isNew: true, isTrending: true, usageCount: 5900, rating: 4.8, inputs: [{ name: 'product', label: 'Product', type: 'text', required: true }, { name: 'duration', label: 'Duration', type: 'select', required: true, options: ['15s', '30s', '60s'] }], outputType: 'text', tags: ['facebook', 'video', 'reels'] },
  { $id: 'm6', name: 'Facebook Retargeting', slug: 'fb-retargeting', shortDescription: 'Retargeting ad copy', description: 'Create retargeting ads for warm audiences.', icon: 'refresh-cw', category: 'facebook-ads', isPro: false, isNew: false, isTrending: false, usageCount: 4200, rating: 4.5, inputs: [{ name: 'product', label: 'Product', type: 'text', required: true }], outputType: 'text', tags: ['facebook', 'retargeting'] },
  { $id: 'm7', name: 'Facebook Ad Audience', slug: 'fb-audience-builder', shortDescription: 'Target audience builder', description: 'AI-powered audience targeting recommendations.', icon: 'users', category: 'facebook-ads', isPro: true, isNew: false, isTrending: true, usageCount: 7100, rating: 4.8, inputs: [{ name: 'product', label: 'Product/Service', type: 'text', required: true }], outputType: 'text', tags: ['facebook', 'audience', 'targeting'] },
  { $id: 'm8', name: 'Messenger Ad Copy', slug: 'messenger-ad-copy', shortDescription: 'Messenger campaign ads', description: 'Create ads that drive conversations on Messenger.', icon: 'message-circle', category: 'facebook-ads', isPro: false, isNew: false, isTrending: false, usageCount: 3100, rating: 4.4, inputs: [{ name: 'business', label: 'Business', type: 'text', required: true }], outputType: 'text', tags: ['messenger', 'facebook', 'chat'] },
  // Instagram Category
  { $id: 'm9', name: 'Instagram Caption', slug: 'instagram-caption', shortDescription: 'Engaging IG captions', description: 'Write scroll-stopping Instagram captions with hashtags.', icon: 'instagram', category: 'instagram', isPro: false, isNew: false, isTrending: true, usageCount: 16200, rating: 4.9, inputs: [{ name: 'topic', label: 'Post Topic', type: 'text', required: true }, { name: 'tone', label: 'Tone', type: 'select', required: false, options: ['Professional', 'Casual', 'Humorous', 'Inspirational'] }], outputType: 'text', tags: ['instagram', 'captions', 'social'] },
  { $id: 'm10', name: 'Instagram Hashtags', slug: 'instagram-hashtags', shortDescription: 'Trending hashtag sets', description: 'Generate relevant hashtag sets for maximum reach.', icon: 'hash', category: 'instagram', isPro: false, isNew: false, isTrending: true, usageCount: 14500, rating: 4.8, inputs: [{ name: 'niche', label: 'Your Niche', type: 'text', required: true }], outputType: 'text', tags: ['instagram', 'hashtags'] },
  { $id: 'm11', name: 'Instagram Reels Script', slug: 'reels-script', shortDescription: 'Viral Reels scripts', description: 'Create engaging scripts for Instagram Reels.', icon: 'film', category: 'instagram', isPro: false, isNew: true, isTrending: true, usageCount: 8900, rating: 4.8, inputs: [{ name: 'topic', label: 'Reel Topic', type: 'text', required: true }], outputType: 'text', tags: ['instagram', 'reels', 'video'] },
  { $id: 'm12', name: 'Instagram Story Ideas', slug: 'story-ideas', shortDescription: 'Story content ideas', description: 'Generate creative Instagram Story ideas for engagement.', icon: 'camera', category: 'instagram', isPro: false, isNew: false, isTrending: true, usageCount: 7200, rating: 4.6, inputs: [{ name: 'brand', label: 'Brand/Niche', type: 'text', required: true }], outputType: 'text', tags: ['instagram', 'stories', 'ideas'] },
  { $id: 'm13', name: 'Instagram Bio Generator', slug: 'instagram-bio', shortDescription: 'Optimized IG bios', description: 'Create compelling Instagram bios that convert followers.', icon: 'user', category: 'instagram', isPro: false, isNew: false, isTrending: false, usageCount: 5400, rating: 4.6, inputs: [{ name: 'business', label: 'Business/Personal Brand', type: 'text', required: true }], outputType: 'text', tags: ['instagram', 'bio', 'profile'] },
  // Social Media Category
  { $id: 'm14', name: 'Social Media Calendar', slug: 'social-calendar', shortDescription: '30-day content calendar', description: 'Generate a full month social media content calendar.', icon: 'calendar', category: 'social-media', isPro: true, isNew: false, isTrending: true, usageCount: 9800, rating: 4.9, inputs: [{ name: 'brand', label: 'Brand', type: 'text', required: true }, { name: 'platforms', label: 'Platforms', type: 'text', required: true }], outputType: 'text', tags: ['calendar', 'planning', 'social'] },
  { $id: 'm15', name: 'Social Post Generator', slug: 'social-post', shortDescription: 'Multi-platform posts', description: 'Create posts optimized for multiple social platforms at once.', icon: 'share-2', category: 'social-media', isPro: false, isNew: false, isTrending: true, usageCount: 11300, rating: 4.8, inputs: [{ name: 'topic', label: 'Topic', type: 'text', required: true }], outputType: 'text', tags: ['social', 'posts', 'multi-platform'] },
  { $id: 'm16', name: 'Engagement Reply Bot', slug: 'engagement-replies', shortDescription: 'Smart comment replies', description: 'Generate thoughtful replies to comments and messages.', icon: 'message-square', category: 'social-media', isPro: false, isNew: true, isTrending: true, usageCount: 4800, rating: 4.5, inputs: [{ name: 'comment', label: 'Comment to Reply To', type: 'textarea', required: true }], outputType: 'text', tags: ['engagement', 'replies', 'social'] },
  { $id: 'm17', name: 'Poll & Quiz Generator', slug: 'poll-quiz', shortDescription: 'Interactive polls & quizzes', description: 'Create engaging polls and quizzes for social media.', icon: 'bar-chart', category: 'social-media', isPro: false, isNew: false, isTrending: false, usageCount: 3600, rating: 4.4, inputs: [{ name: 'topic', label: 'Topic', type: 'text', required: true }], outputType: 'text', tags: ['poll', 'quiz', 'engagement'] },
  // Meta Content Category
  { $id: 'm18', name: 'Ad Creative Brief', slug: 'ad-creative-brief', shortDescription: 'Creative briefs for designers', description: 'Generate detailed creative briefs for ad designers.', icon: 'edit-3', category: 'meta-content', isPro: true, isNew: false, isTrending: false, usageCount: 3900, rating: 4.5, inputs: [{ name: 'campaign', label: 'Campaign Objective', type: 'text', required: true }], outputType: 'text', tags: ['creative', 'brief', 'design'] },
  { $id: 'm19', name: 'Meme Caption Writer', slug: 'meme-caption', shortDescription: 'Viral meme captions', description: 'Create funny and shareable meme captions for brands.', icon: 'smile', category: 'meta-content', isPro: false, isNew: true, isTrending: true, usageCount: 6200, rating: 4.7, inputs: [{ name: 'brand', label: 'Brand', type: 'text', required: true }, { name: 'topic', label: 'Meme Topic', type: 'text', required: true }], outputType: 'text', tags: ['meme', 'humor', 'viral'] },
  // TikTok Category
  { $id: 'm20', name: 'TikTok Video Script', slug: 'tiktok-script', shortDescription: 'Viral TikTok scripts', description: 'Create trending TikTok video scripts with hooks.', icon: 'video', category: 'tiktok', isPro: false, isNew: true, isTrending: true, usageCount: 12100, rating: 4.9, inputs: [{ name: 'topic', label: 'Video Topic', type: 'text', required: true }], outputType: 'text', tags: ['tiktok', 'video', 'viral'] },
  { $id: 'm21', name: 'TikTok Ad Copy', slug: 'tiktok-ad-copy', shortDescription: 'TikTok Ads Manager copy', description: 'Create ad copy optimized for TikTok Ads Manager.', icon: 'target', category: 'tiktok', isPro: true, isNew: true, isTrending: true, usageCount: 5600, rating: 4.7, inputs: [{ name: 'product', label: 'Product', type: 'text', required: true }], outputType: 'text', tags: ['tiktok', 'ads', 'copy'] },
  { $id: 'm22', name: 'TikTok Hashtag Finder', slug: 'tiktok-hashtags', shortDescription: 'Trending TikTok tags', description: 'Discover trending hashtags for TikTok reach.', icon: 'hash', category: 'tiktok', isPro: false, isNew: false, isTrending: true, usageCount: 8700, rating: 4.7, inputs: [{ name: 'niche', label: 'Your Niche', type: 'text', required: true }], outputType: 'text', tags: ['tiktok', 'hashtags', 'trending'] },
  // YouTube Category
  { $id: 'm23', name: 'YouTube Title Generator', slug: 'youtube-title', shortDescription: 'Clickable video titles', description: 'Generate high-CTR YouTube video titles.', icon: 'youtube', category: 'youtube', isPro: false, isNew: false, isTrending: true, usageCount: 11800, rating: 4.8, inputs: [{ name: 'topic', label: 'Video Topic', type: 'text', required: true }], outputType: 'text', tags: ['youtube', 'titles', 'ctr'] },
  { $id: 'm24', name: 'YouTube Description', slug: 'youtube-description', shortDescription: 'SEO video descriptions', description: 'Write YouTube descriptions with timestamps and links.', icon: 'file-text', category: 'youtube', isPro: false, isNew: false, isTrending: true, usageCount: 9400, rating: 4.7, inputs: [{ name: 'title', label: 'Video Title', type: 'text', required: true }], outputType: 'text', tags: ['youtube', 'description', 'seo'] },
  { $id: 'm25', name: 'YouTube Script Writer', slug: 'youtube-script', shortDescription: 'Full video scripts', description: 'Create complete YouTube video scripts with hooks and CTAs.', icon: 'edit', category: 'youtube', isPro: true, isNew: false, isTrending: true, usageCount: 7600, rating: 4.9, inputs: [{ name: 'topic', label: 'Video Topic', type: 'text', required: true }, { name: 'duration', label: 'Target Duration', type: 'select', required: true, options: ['5 min', '10 min', '15 min', '20 min'] }], outputType: 'text', tags: ['youtube', 'script', 'video'] },
  { $id: 'm26', name: 'YouTube Tags Generator', slug: 'youtube-tags', shortDescription: 'Video tags for reach', description: 'Generate optimized tags for YouTube video discovery.', icon: 'tag', category: 'youtube', isPro: false, isNew: false, isTrending: false, usageCount: 6800, rating: 4.6, inputs: [{ name: 'title', label: 'Video Title', type: 'text', required: true }], outputType: 'text', tags: ['youtube', 'tags', 'discovery'] },
  // LinkedIn Category
  { $id: 'm27', name: 'LinkedIn Post Writer', slug: 'linkedin-post', shortDescription: 'Professional LinkedIn posts', description: 'Create engaging LinkedIn posts for thought leadership.', icon: 'linkedin', category: 'linkedin', isPro: false, isNew: false, isTrending: true, usageCount: 10500, rating: 4.8, inputs: [{ name: 'topic', label: 'Post Topic', type: 'text', required: true }], outputType: 'text', tags: ['linkedin', 'posts', 'professional'] },
  { $id: 'm28', name: 'LinkedIn Ad Copy', slug: 'linkedin-ad-copy', shortDescription: 'B2B LinkedIn ads', description: 'Write LinkedIn Sponsored Content and InMail ads.', icon: 'briefcase', category: 'linkedin', isPro: true, isNew: false, isTrending: true, usageCount: 5300, rating: 4.7, inputs: [{ name: 'offer', label: 'Offer/Product', type: 'text', required: true }, { name: 'audience', label: 'Target Audience', type: 'text', required: true }], outputType: 'text', tags: ['linkedin', 'ads', 'b2b'] },
  { $id: 'm29', name: 'LinkedIn Profile Bio', slug: 'linkedin-bio', shortDescription: 'Professional bio writer', description: 'Create a compelling LinkedIn About section.', icon: 'user', category: 'linkedin', isPro: false, isNew: false, isTrending: false, usageCount: 6100, rating: 4.6, inputs: [{ name: 'role', label: 'Your Role', type: 'text', required: true }], outputType: 'text', tags: ['linkedin', 'bio', 'profile'] },
  // Twitter/X Category
  { $id: 'm30', name: 'Tweet Generator', slug: 'tweet-generator', shortDescription: 'Viral tweets', description: 'Create engaging tweets that get likes and retweets.', icon: 'twitter', category: 'twitter', isPro: false, isNew: false, isTrending: true, usageCount: 13200, rating: 4.8, inputs: [{ name: 'topic', label: 'Topic', type: 'text', required: true }], outputType: 'text', tags: ['twitter', 'tweets', 'viral'] },
  { $id: 'm31', name: 'Twitter Thread Writer', slug: 'twitter-thread', shortDescription: 'Multi-tweet threads', description: 'Create engaging Twitter threads that educate and convert.', icon: 'align-left', category: 'twitter', isPro: true, isNew: false, isTrending: true, usageCount: 7800, rating: 4.8, inputs: [{ name: 'topic', label: 'Thread Topic', type: 'text', required: true }], outputType: 'text', tags: ['twitter', 'thread', 'content'] },
  { $id: 'm32', name: 'X Ads Copy', slug: 'x-ads-copy', shortDescription: 'Twitter/X ad campaigns', description: 'Write ad copy for X Promoted Tweets and campaigns.', icon: 'target', category: 'twitter', isPro: true, isNew: true, isTrending: false, usageCount: 3200, rating: 4.5, inputs: [{ name: 'product', label: 'Product', type: 'text', required: true }], outputType: 'text', tags: ['twitter', 'ads', 'promoted'] },
  // Pinterest Category
  { $id: 'm33', name: 'Pinterest Pin Description', slug: 'pinterest-description', shortDescription: 'SEO pin descriptions', description: 'Write keyword-rich Pinterest pin descriptions.', icon: 'image', category: 'pinterest', isPro: false, isNew: false, isTrending: false, usageCount: 4600, rating: 4.5, inputs: [{ name: 'pin', label: 'Pin Topic', type: 'text', required: true }], outputType: 'text', tags: ['pinterest', 'pins', 'seo'] },
  { $id: 'm34', name: 'Pinterest Board Ideas', slug: 'pinterest-boards', shortDescription: 'Board strategy', description: 'Generate Pinterest board ideas and organization strategy.', icon: 'grid', category: 'pinterest', isPro: false, isNew: false, isTrending: false, usageCount: 2900, rating: 4.4, inputs: [{ name: 'niche', label: 'Your Niche', type: 'text', required: true }], outputType: 'text', tags: ['pinterest', 'boards', 'strategy'] },

  // ===== SHOPIFY / E-COMMERCE PLATFORM TOOLS =====
  // Product Listings Category
  { $id: 's1', name: 'Product Title Optimizer', slug: 'product-title-optimizer', shortDescription: 'SEO product titles', description: 'Create keyword-rich product titles that rank on Shopify and Google.', icon: 'tag', category: 'shopify-products', isPro: false, isNew: false, isTrending: true, usageCount: 9800, rating: 4.8, inputs: [{ name: 'product', label: 'Product Name', type: 'text', required: true }, { name: 'keywords', label: 'Target Keywords', type: 'text', required: true }], outputType: 'text', tags: ['shopify', 'product', 'titles'] },
  { $id: 's2', name: 'Product Description Writer', slug: 'product-description', shortDescription: 'Compelling product copy', description: 'Write product descriptions that sell with features and benefits.', icon: 'file-text', category: 'shopify-products', isPro: false, isNew: false, isTrending: true, usageCount: 12400, rating: 4.9, inputs: [{ name: 'product', label: 'Product', type: 'text', required: true }, { name: 'features', label: 'Key Features', type: 'textarea', required: true }], outputType: 'text', tags: ['shopify', 'description', 'copy'] },
  { $id: 's3', name: 'Bullet Points Generator', slug: 'product-bullets', shortDescription: 'Feature bullet points', description: 'Create scannable product bullet points for listings.', icon: 'list', category: 'shopify-products', isPro: false, isNew: false, isTrending: true, usageCount: 8700, rating: 4.7, inputs: [{ name: 'product', label: 'Product', type: 'text', required: true }], outputType: 'text', tags: ['bullets', 'features', 'shopify'] },
  { $id: 's4', name: 'Collection Description', slug: 'collection-description', shortDescription: 'Category page copy', description: 'Write SEO-friendly collection and category page descriptions.', icon: 'folder', category: 'shopify-products', isPro: false, isNew: false, isTrending: false, usageCount: 4300, rating: 4.5, inputs: [{ name: 'collection', label: 'Collection Name', type: 'text', required: true }], outputType: 'text', tags: ['collection', 'category', 'shopify'] },
  { $id: 's5', name: 'Product Review Response', slug: 'review-response', shortDescription: 'Reply to reviews', description: 'Generate professional responses to customer reviews.', icon: 'message-circle', category: 'shopify-products', isPro: false, isNew: true, isTrending: true, usageCount: 5100, rating: 4.6, inputs: [{ name: 'review', label: 'Customer Review', type: 'textarea', required: true }], outputType: 'text', tags: ['reviews', 'responses', 'customer'] },
  { $id: 's6', name: 'Product Comparison', slug: 'product-comparison', shortDescription: 'Compare products', description: 'Create product comparison tables and content.', icon: 'columns', category: 'shopify-products', isPro: true, isNew: false, isTrending: false, usageCount: 3200, rating: 4.5, inputs: [{ name: 'product1', label: 'Product 1', type: 'text', required: true }, { name: 'product2', label: 'Product 2', type: 'text', required: true }], outputType: 'text', tags: ['comparison', 'products'] },
  // Shopping Ads Category
  { $id: 's7', name: 'Google Shopping Title', slug: 'shopping-title', shortDescription: 'Shopping feed titles', description: 'Optimize product titles for Google Shopping feeds.', icon: 'shopping-cart', category: 'shopify-ads', isPro: false, isNew: false, isTrending: true, usageCount: 7600, rating: 4.8, inputs: [{ name: 'product', label: 'Product Name', type: 'text', required: true }, { name: 'brand', label: 'Brand', type: 'text', required: true }], outputType: 'text', tags: ['shopping', 'feed', 'titles'] },
  { $id: 's8', name: 'Facebook Shop Ads', slug: 'fb-shop-ads', shortDescription: 'Facebook catalog ads', description: 'Create ad copy for Facebook/Instagram Shopping campaigns.', icon: 'facebook', category: 'shopify-ads', isPro: false, isNew: false, isTrending: true, usageCount: 6300, rating: 4.7, inputs: [{ name: 'product', label: 'Product', type: 'text', required: true }], outputType: 'text', tags: ['facebook', 'shopping', 'catalog'] },
  { $id: 's9', name: 'Sale & Promo Ads', slug: 'sale-promo-ads', shortDescription: 'Promotional ad copy', description: 'Create urgency-driven sale and promotion ad copy.', icon: 'percent', category: 'shopify-ads', isPro: false, isNew: false, isTrending: true, usageCount: 8100, rating: 4.7, inputs: [{ name: 'sale', label: 'Sale/Offer Details', type: 'text', required: true }], outputType: 'text', tags: ['sale', 'promo', 'urgency'] },
  { $id: 's10', name: 'Abandoned Cart Ads', slug: 'abandoned-cart-ads', shortDescription: 'Win back shoppers', description: 'Create retargeting ads for abandoned cart recovery.', icon: 'shopping-bag', category: 'shopify-ads', isPro: true, isNew: false, isTrending: true, usageCount: 5400, rating: 4.6, inputs: [{ name: 'store', label: 'Store Name', type: 'text', required: true }], outputType: 'text', tags: ['abandoned', 'cart', 'retargeting'] },
  { $id: 's11', name: 'Dynamic Product Ads', slug: 'dynamic-product-ads', shortDescription: 'DPA feed optimization', description: 'Optimize dynamic product ad feeds for better ROAS.', icon: 'refresh-cw', category: 'shopify-ads', isPro: true, isNew: true, isTrending: false, usageCount: 3800, rating: 4.5, inputs: [{ name: 'catalog', label: 'Catalog Type', type: 'select', required: true, options: ['Fashion', 'Electronics', 'Home', 'Beauty', 'Food'] }], outputType: 'text', tags: ['dpa', 'dynamic', 'catalog'] },
  // Email Marketing Category
  { $id: 's12', name: 'Welcome Email Series', slug: 'welcome-email-series', shortDescription: 'Onboarding email flow', description: 'Create a multi-email welcome series for new subscribers.', icon: 'mail', category: 'email-marketing', isPro: true, isNew: false, isTrending: true, usageCount: 7200, rating: 4.8, inputs: [{ name: 'brand', label: 'Brand Name', type: 'text', required: true }], outputType: 'text', tags: ['email', 'welcome', 'onboarding'] },
  { $id: 's13', name: 'Abandoned Cart Email', slug: 'abandoned-cart-email', shortDescription: 'Cart recovery emails', description: 'Write abandoned cart recovery emails that convert.', icon: 'shopping-cart', category: 'email-marketing', isPro: false, isNew: false, isTrending: true, usageCount: 9100, rating: 4.9, inputs: [{ name: 'store', label: 'Store Name', type: 'text', required: true }], outputType: 'text', tags: ['email', 'cart', 'recovery'] },
  { $id: 's14', name: 'Email Subject Lines', slug: 'email-subject-lines', shortDescription: 'High open-rate subjects', description: 'Generate email subject lines with high open rates.', icon: 'mail', category: 'email-marketing', isPro: false, isNew: false, isTrending: true, usageCount: 11600, rating: 4.8, inputs: [{ name: 'topic', label: 'Email Topic', type: 'text', required: true }], outputType: 'text', tags: ['email', 'subject', 'open-rate'] },
  { $id: 's15', name: 'Product Launch Email', slug: 'product-launch-email', shortDescription: 'New product announcements', description: 'Create buzz-building product launch email campaigns.', icon: 'send', category: 'email-marketing', isPro: false, isNew: false, isTrending: false, usageCount: 5800, rating: 4.7, inputs: [{ name: 'product', label: 'New Product', type: 'text', required: true }], outputType: 'text', tags: ['email', 'launch', 'product'] },
  { $id: 's16', name: 'Win-Back Email', slug: 'win-back-email', shortDescription: 'Re-engage lapsed customers', description: 'Create win-back emails for inactive customers.', icon: 'heart', category: 'email-marketing', isPro: true, isNew: false, isTrending: false, usageCount: 3900, rating: 4.5, inputs: [{ name: 'brand', label: 'Brand', type: 'text', required: true }], outputType: 'text', tags: ['email', 'win-back', 'retention'] },
  // E-commerce SEO Category
  { $id: 's17', name: 'Product Page SEO', slug: 'product-page-seo', shortDescription: 'Product page optimization', description: 'Optimize product page meta tags and content for search.', icon: 'search', category: 'ecommerce-seo', isPro: false, isNew: false, isTrending: true, usageCount: 7400, rating: 4.7, inputs: [{ name: 'product', label: 'Product Name', type: 'text', required: true }], outputType: 'text', tags: ['seo', 'product', 'ecommerce'] },
  { $id: 's18', name: 'Store Blog Writer', slug: 'store-blog', shortDescription: 'E-commerce blog posts', description: 'Write blog posts that drive organic traffic to your store.', icon: 'book-open', category: 'ecommerce-seo', isPro: true, isNew: false, isTrending: true, usageCount: 5600, rating: 4.7, inputs: [{ name: 'topic', label: 'Blog Topic', type: 'text', required: true }], outputType: 'text', tags: ['blog', 'ecommerce', 'seo'] },
  { $id: 's19', name: 'Category Page SEO', slug: 'category-seo', shortDescription: 'Category page optimization', description: 'Optimize collection/category pages for search engines.', icon: 'grid', category: 'ecommerce-seo', isPro: false, isNew: false, isTrending: false, usageCount: 3800, rating: 4.5, inputs: [{ name: 'category', label: 'Category Name', type: 'text', required: true }], outputType: 'text', tags: ['category', 'seo', 'ecommerce'] },
  { $id: 's20', name: 'Product Schema Generator', slug: 'product-schema', shortDescription: 'Product rich snippets', description: 'Generate product schema markup for Google rich results.', icon: 'code', category: 'ecommerce-seo', isPro: true, isNew: true, isTrending: false, usageCount: 2800, rating: 4.5, inputs: [{ name: 'product', label: 'Product Name', type: 'text', required: true }, { name: 'price', label: 'Price', type: 'text', required: true }], outputType: 'code', tags: ['schema', 'product', 'rich-snippets'] },

  // ===== AI MARKETING AGENTS =====
  { $id: 'a1', name: 'AI Campaign Optimizer', slug: 'ai-campaign-optimizer', shortDescription: '24/7 campaign optimization', description: 'AI agent that continuously optimizes your campaigns.', icon: 'cpu', category: 'ai-agents', isPro: true, isNew: true, isTrending: true, usageCount: 4500, rating: 4.9, inputs: [{ name: 'campaign', label: 'Campaign Type', type: 'select', required: true, options: ['Google Ads', 'Facebook Ads', 'Email'] }], outputType: 'text', tags: ['ai', 'automation', 'optimization'] },
  { $id: 'a2', name: 'AI Content Planner', slug: 'ai-content-planner', shortDescription: 'Smart content strategy', description: 'AI plans your content calendar based on trends and data.', icon: 'cpu', category: 'ai-agents', isPro: true, isNew: true, isTrending: true, usageCount: 3800, rating: 4.8, inputs: [{ name: 'brand', label: 'Brand', type: 'text', required: true }], outputType: 'text', tags: ['ai', 'content', 'planning'] },
  { $id: 'a3', name: 'AI Budget Allocator', slug: 'ai-budget-allocator', shortDescription: 'Smart budget distribution', description: 'AI distributes your ad budget across channels for max ROI.', icon: 'dollar-sign', category: 'ai-agents', isPro: true, isNew: true, isTrending: true, usageCount: 2900, rating: 4.7, inputs: [{ name: 'budget', label: 'Monthly Budget', type: 'number', required: true }, { name: 'channels', label: 'Active Channels', type: 'text', required: true }], outputType: 'text', tags: ['ai', 'budget', 'allocation'] },
  { $id: 'a4', name: 'AI A/B Test Generator', slug: 'ai-ab-test', shortDescription: 'Smart A/B test ideas', description: 'AI generates A/B test hypotheses based on your data.', icon: 'git-branch', category: 'ai-agents', isPro: true, isNew: false, isTrending: false, usageCount: 2400, rating: 4.6, inputs: [{ name: 'page', label: 'Page/Element to Test', type: 'text', required: true }], outputType: 'text', tags: ['ai', 'ab-test', 'optimization'] },
  { $id: 'a5', name: 'AI Trend Detector', slug: 'ai-trend-detector', shortDescription: 'Spot trending topics', description: 'AI identifies trending topics and opportunities in your niche.', icon: 'trending-up', category: 'ai-agents', isPro: true, isNew: true, isTrending: true, usageCount: 3200, rating: 4.7, inputs: [{ name: 'niche', label: 'Your Niche', type: 'text', required: true }], outputType: 'text', tags: ['ai', 'trends', 'opportunities'] },
];

export const useToolsStore = create<ToolsState>((set, get) => ({
  tools: ALL_TOOLS as Tool[],
  categories: TOOL_CATEGORIES.map(c => c.id),
  featuredTools: (ALL_TOOLS as Tool[]).slice(0, 20),
  recentTools: [],
  favoriteTools: [],
  generations: [],
  selectedTool: null,
  isLoading: false,
  isGenerating: false,
  error: null,

  fetchTools: async () => {
    set({ isLoading: true });
    try {
      set({ tools: ALL_TOOLS as Tool[], isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  fetchToolBySlug: async (slug: string) => {
    const tool = get().tools.find(t => t.slug === slug);
    if (tool) {
      set({ selectedTool: tool });
      return tool;
    }
    return null;
  },

  fetchGenerations: async (userId: string) => {
    set({ isLoading: true });
    try {
      const result = await dbService.listDocuments<Generation & Models.Document>(
        COLLECTIONS.GENERATIONS,
        [Query.equal('userId', userId), Query.orderDesc('createdAt'), Query.limit(50)]
      );
      set({ generations: result.documents as Generation[], isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  addGeneration: async (generation: Omit<Generation, '$id'>) => {
    try {
      const newGen = await dbService.createDocument<Generation & Models.Document>(
        COLLECTIONS.GENERATIONS,
        generation
      );
      set(state => ({
        generations: [newGen as Generation, ...state.generations],
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  toggleFavorite: async (generationId: string) => {
    const generation = get().generations.find(g => g.$id === generationId);
    if (!generation) return;

    try {
      await dbService.updateDocument(COLLECTIONS.GENERATIONS, generationId, {
        isFavorite: !generation.isFavorite,
      });
      set(state => ({
        generations: state.generations.map(g =>
          g.$id === generationId ? { ...g, isFavorite: !g.isFavorite } : g
        ),
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  deleteGeneration: async (generationId: string) => {
    try {
      await dbService.deleteDocument(COLLECTIONS.GENERATIONS, generationId);
      set(state => ({
        generations: state.generations.filter(g => g.$id !== generationId),
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  setSelectedTool: (tool: Tool | null) => set({ selectedTool: tool }),

  searchTools: (query: string) => {
    const lowerQuery = query.toLowerCase();
    return get().tools.filter(
      t =>
        t.name.toLowerCase().includes(lowerQuery) ||
        t.description.toLowerCase().includes(lowerQuery) ||
        t.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  },

  getToolsByCategory: (category: string) => {
    return get().tools.filter(t => t.category === category);
  },

  generateContent: async (toolId: string, inputs: Record<string, any>) => {
    set({ isGenerating: true, error: null });
    try {
      const tool = get().tools.find(t => t.$id === toolId);
      if (!tool) throw new Error('Tool not found');

      const outputCount = inputs.outputCount || 3;
      let realMetricsContext = '';

      // FETCH REAL DATA (No Scam, No Fake, No Demo)
      try {
        if (REAL_DATA_TOOLS.GOOGLE_ADS.includes(tool.slug)) {
          if (inputs.customerId) {
            const performance = await googleAdsDirect.getCampaignPerformance(inputs.customerId);
            realMetricsContext = `Real Google Ads Data: ${JSON.stringify(performance)}`;
          }
        } else if (REAL_DATA_TOOLS.META_ADS.includes(tool.slug)) {
          if (inputs.adAccountId && inputs.metaAccessToken) {
            const performance = await metaAdsDirect.getCampaignPerformance(inputs.adAccountId, inputs.metaAccessToken);
            realMetricsContext = `Real Meta Ads Data: ${JSON.stringify(performance)}`;
          }
        } else if (REAL_DATA_TOOLS.ANALYTICS.includes(tool.slug)) {
          if (inputs.propertyId) {
            const stats = await googleAnalyticsDirect.getTrafficStats(inputs.propertyId);
            realMetricsContext = `Real GA4 Analytics Data: ${JSON.stringify(stats)}`;
          }
        }
      } catch (dataErr) {
        console.warn('[ToolsStore] Real data fetch failed, using manual inputs only:', dataErr);
      }

      const enhancedInputs = {
        ...inputs,
        real_data_context: realMetricsContext,
        is_live_data: !!realMetricsContext,
      };

      const result = await generateAIContent({
        toolSlug: tool.slug,
        toolName: tool.name,
        inputs: enhancedInputs,
        tone: inputs.tone,
        language: inputs.language,
        outputCount,
      });

      if (!result.success || result.outputs.length === 0) {
        throw new Error(result.error || 'Failed to generate content');
      }

      set({ isGenerating: false });

      // Save generation to history (Appwrite database)
      const outputText = result.outputs.map((o: any) => typeof o === 'string' ? o : JSON.stringify(o)).join('\n\n---\n\n');
      try {
        await get().addGeneration({
          userId: inputs.userId || '',
          toolId,
          toolName: tool.name,
          input: inputs,
          output: outputText,
          outputType: tool.outputType,
          createdAt: new Date().toISOString(),
          isFavorite: false,
        });
      } catch (saveErr) {
        console.warn('[ToolsStore] Failed to save generation to history:', saveErr);
      }

      return {
        toolId,
        outputs: result.outputs,
        createdAt: new Date().toISOString(),
        tokensUsed: result.tokensUsed,
      };
    } catch (error: any) {
      set({ isGenerating: false, error: error.message });
      throw error;
    }
  },
}));

export default useToolsStore;
