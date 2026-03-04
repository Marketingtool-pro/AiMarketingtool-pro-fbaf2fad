import { create } from 'zustand';
import { Models } from 'react-native-appwrite';
import { dbService, COLLECTIONS, Query } from '../services/appwrite';
import { generateAIContent } from '../services/aiService';

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
}

// 3 Main Platforms
export const PLATFORMS = [
  { id: 'google', name: 'Google Ads', icon: 'search', color: '#4285F4', toolCount: 68 },
  { id: 'meta', name: 'Meta/Facebook', icon: 'facebook', color: '#1877F2', toolCount: 72 },
  { id: 'shopify', name: 'Shopify/E-commerce', icon: 'shopping-bag', color: '#96BF48', toolCount: 66 },
];

// AI Tool Categories (matching web app)
export const TOOL_CATEGORIES = [
  // Google Platform Categories
  { id: 'google-ads', name: 'Google Ads', icon: 'target', count: 24, platform: 'google' },
  { id: 'google-seo', name: 'Google SEO', icon: 'search', count: 22, platform: 'google' },
  { id: 'google-analytics', name: 'Analytics', icon: 'bar-chart-2', count: 12, platform: 'google' },
  { id: 'google-content', name: 'Content & Blogs', icon: 'file-text', count: 10, platform: 'google' },
  // Meta/Facebook Platform Categories
  { id: 'facebook-ads', name: 'Facebook Ads', icon: 'target', count: 26, platform: 'meta' },
  { id: 'instagram', name: 'Instagram', icon: 'instagram', count: 20, platform: 'meta' },
  { id: 'social-media', name: 'Social Media', icon: 'share-2', count: 16, platform: 'meta' },
  { id: 'meta-content', name: 'Content Creator', icon: 'edit-3', count: 10, platform: 'meta' },
  // Shopify/E-commerce Platform Categories
  { id: 'shopify-products', name: 'Product Listings', icon: 'shopping-bag', count: 22, platform: 'shopify' },
  { id: 'shopify-ads', name: 'Shopping Ads', icon: 'target', count: 18, platform: 'shopify' },
  { id: 'email-marketing', name: 'Email Marketing', icon: 'mail', count: 14, platform: 'shopify' },
  { id: 'ecommerce-seo', name: 'E-commerce SEO', icon: 'search', count: 12, platform: 'shopify' },
  // AI Marketing Agents (All Platforms)
  { id: 'ai-agents', name: 'AI Marketing Agents', icon: 'cpu', count: 10, platform: 'all' },
  // Content Creation Tools
  { id: 'content-creation', name: 'Content Creation', icon: 'edit', count: 15, platform: 'all' },
];

// AI Marketing Tools across 3 Platforms
const SAMPLE_TOOLS: Tool[] = [
  // ===== GOOGLE PLATFORM TOOLS (68 tools) =====
  // Google Ads Category (24 tools)
  { $id: 'g1', name: 'Google Ads Headline Generator', slug: 'google-ads-headline', shortDescription: 'Create compelling Google Ads headlines', description: 'Generate high-CTR headlines for Google Search and Display ads.', icon: 'type', category: 'google-ads', isPro: false, isNew: false, isTrending: true, usageCount: 15200, rating: 4.9, inputs: [{ name: 'product', label: 'Product/Service', type: 'text', required: true }, { name: 'keywords', label: 'Target Keywords', type: 'text', required: true }], outputType: 'text', tags: ['google', 'ads', 'headlines'] },
  { $id: 'g2', name: 'Google Ads Description Writer', slug: 'google-ads-description', shortDescription: 'Write Google Ads descriptions', description: 'Create persuasive ad descriptions that convert.', icon: 'align-left', category: 'google-ads', isPro: false, isNew: false, isTrending: true, usageCount: 12800, rating: 4.8, inputs: [{ name: 'headline', label: 'Ad Headline', type: 'text', required: true }, { name: 'offer', label: 'Your Offer', type: 'textarea', required: true }], outputType: 'text', tags: ['google', 'ads', 'copy'] },
  { $id: 'g3', name: 'Google Performance Max Generator', slug: 'google-pmax', shortDescription: 'Performance Max ad assets', description: 'Generate complete asset groups for Performance Max campaigns.', icon: 'zap', category: 'google-ads', isPro: true, isNew: true, isTrending: true, usageCount: 8900, rating: 4.7, inputs: [{ name: 'business', label: 'Business Description', type: 'textarea', required: true }], outputType: 'text', tags: ['google', 'pmax', 'automation'] },
  { $id: 'g4', name: 'Google Display Ad Copy', slug: 'google-display-copy', shortDescription: 'Display network ad copy', description: 'Create engaging copy for Google Display Network.', icon: 'image', category: 'google-ads', isPro: false, isNew: false, isTrending: false, usageCount: 6700, rating: 4.6, inputs: [{ name: 'product', label: 'Product', type: 'text', required: true }], outputType: 'text', tags: ['google', 'display', 'ads'] },
  { $id: 'g5', name: 'Google Shopping Feed Optimizer', slug: 'google-shopping-feed', shortDescription: 'Optimize product feeds', description: 'Enhance product titles and descriptions for Google Shopping.', icon: 'shopping-cart', category: 'google-ads', isPro: true, isNew: false, isTrending: true, usageCount: 9200, rating: 4.8, inputs: [{ name: 'productTitle', label: 'Current Title', type: 'text', required: true }, { name: 'features', label: 'Features', type: 'textarea', required: true }], outputType: 'text', tags: ['shopping', 'feed', 'products'] },
  { $id: 'g6', name: 'Google Responsive Search Ads', slug: 'google-rsa', shortDescription: 'RSA headline & description sets', description: 'Generate 15 headlines and 4 descriptions for RSA.', icon: 'layers', category: 'google-ads', isPro: false, isNew: false, isTrending: true, usageCount: 11500, rating: 4.9, inputs: [{ name: 'business', label: 'Business', type: 'text', required: true }], outputType: 'text', tags: ['google', 'rsa', 'responsive'] },
  { $id: 'g7', name: 'Google Ad Extensions Writer', slug: 'google-extensions', shortDescription: 'Sitelinks & callouts', description: 'Create compelling ad extensions for better CTR.', icon: 'plus-square', category: 'google-ads', isPro: false, isNew: false, isTrending: false, usageCount: 5400, rating: 4.5, inputs: [{ name: 'website', label: 'Website URL', type: 'text', required: true }], outputType: 'text', tags: ['extensions', 'sitelinks'] },
  { $id: 'g8', name: 'Google Keyword Planner AI', slug: 'google-keyword-ai', shortDescription: 'AI keyword suggestions', description: 'Discover high-intent keywords with AI analysis.', icon: 'key', category: 'google-ads', isPro: true, isNew: true, isTrending: true, usageCount: 7800, rating: 4.7, inputs: [{ name: 'seed', label: 'Seed Keywords', type: 'text', required: true }], outputType: 'text', tags: ['keywords', 'research'] },
  // Google SEO Category (22 tools)
  { $id: 'g9', name: 'SEO Meta Title Generator', slug: 'seo-meta-title', shortDescription: 'Optimized meta titles', description: 'Generate SEO-friendly meta titles under 60 characters.', icon: 'hash', category: 'google-seo', isPro: false, isNew: false, isTrending: true, usageCount: 14200, rating: 4.8, inputs: [{ name: 'page', label: 'Page Topic', type: 'text', required: true }, { name: 'keyword', label: 'Target Keyword', type: 'text', required: true }], outputType: 'text', tags: ['seo', 'meta', 'titles'] },
  { $id: 'g10', name: 'SEO Meta Description Writer', slug: 'seo-meta-description', shortDescription: 'Compelling meta descriptions', description: 'Create click-worthy meta descriptions with keywords.', icon: 'file-text', category: 'google-seo', isPro: false, isNew: false, isTrending: true, usageCount: 13800, rating: 4.8, inputs: [{ name: 'title', label: 'Page Title', type: 'text', required: true }], outputType: 'text', tags: ['seo', 'meta', 'descriptions'] },
  { $id: 'g11', name: 'SEO Blog Post Writer', slug: 'seo-blog-writer', shortDescription: 'SEO-optimized blog posts', description: 'Generate long-form SEO content with proper structure.', icon: 'book-open', category: 'google-seo', isPro: true, isNew: false, isTrending: true, usageCount: 11200, rating: 4.9, inputs: [{ name: 'topic', label: 'Blog Topic', type: 'text', required: true }, { name: 'keywords', label: 'Keywords', type: 'text', required: false }], outputType: 'text', tags: ['blog', 'seo', 'content'] },
  { $id: 'g12', name: 'Schema Markup Generator', slug: 'schema-markup', shortDescription: 'Structured data markup', description: 'Generate JSON-LD schema for rich snippets.', icon: 'code', category: 'google-seo', isPro: true, isNew: false, isTrending: false, usageCount: 4500, rating: 4.6, inputs: [{ name: 'type', label: 'Schema Type', type: 'select', required: true, options: ['Article', 'Product', 'LocalBusiness', 'FAQ'] }], outputType: 'code', tags: ['schema', 'structured-data'] },
  { $id: 'g13', name: 'Internal Linking Suggestions', slug: 'internal-links', shortDescription: 'Smart internal link ideas', description: 'AI-powered internal linking recommendations.', icon: 'link', category: 'google-seo', isPro: true, isNew: true, isTrending: false, usageCount: 3200, rating: 4.5, inputs: [{ name: 'content', label: 'Your Content', type: 'textarea', required: true }], outputType: 'text', tags: ['links', 'seo'] },
  // Analytics Category (12 tools)
  { $id: 'g14', name: 'GA4 Report Generator', slug: 'ga4-reports', shortDescription: 'Analytics insights', description: 'Generate actionable insights from your GA4 data.', icon: 'bar-chart-2', category: 'google-analytics', isPro: true, isNew: true, isTrending: true, usageCount: 6700, rating: 4.7, inputs: [{ name: 'metric', label: 'Focus Metric', type: 'select', required: true, options: ['Traffic', 'Conversions', 'Engagement', 'Revenue'] }], outputType: 'text', tags: ['analytics', 'ga4', 'reports'] },
  { $id: 'g15', name: 'Google Ads Performance Grader', slug: 'ads-grader', shortDescription: 'Analyze ad performance', description: 'Get AI recommendations to improve your Google Ads.', icon: 'trending-up', category: 'google-analytics', isPro: false, isNew: false, isTrending: true, usageCount: 8900, rating: 4.8, inputs: [{ name: 'account', label: 'Account Overview', type: 'textarea', required: true }], outputType: 'text', tags: ['grader', 'analysis'] },
  // ===== META/FACEBOOK PLATFORM TOOLS (72 tools) =====
  // Facebook Ads Category (26 tools)
  { $id: 'm1', name: 'Facebook Ad Copy Generator', slug: 'facebook-ad-copy', shortDescription: 'High-converting FB ads', description: 'Create scroll-stopping Facebook ad copy.', icon: 'facebook', category: 'facebook-ads', isPro: false, isNew: false, isTrending: true, usageCount: 18500, rating: 4.9, inputs: [{ name: 'product', label: 'Product', type: 'text', required: true }, { name: 'audience', label: 'Target Audience', type: 'text', required: true }], outputType: 'text', tags: ['facebook', 'ads', 'copy'] },
  { $id: 'm2', name: 'Facebook Carousel Ad Writer', slug: 'facebook-carousel', shortDescription: 'Carousel card copy', description: 'Write compelling copy for each carousel card.', icon: 'layers', category: 'facebook-ads', isPro: false, isNew: false, isTrending: true, usageCount: 9800, rating: 4.7, inputs: [{ name: 'products', label: 'Products/Services', type: 'textarea', required: true }], outputType: 'text', tags: ['carousel', 'facebook'] },
  { $id: 'm3', name: 'Facebook Lead Ad Forms', slug: 'facebook-lead-forms', shortDescription: 'Lead generation forms', description: 'Design high-converting lead ad forms.', icon: 'user-plus', category: 'facebook-ads', isPro: true, isNew: false, isTrending: false, usageCount: 5600, rating: 4.6, inputs: [{ name: 'offer', label: 'Lead Magnet', type: 'text', required: true }], outputType: 'text', tags: ['leads', 'forms'] },
  { $id: 'm4', name: 'Facebook Video Ad Script', slug: 'facebook-video-script', shortDescription: 'Video ad scripts', description: 'Create engaging video ad scripts for Facebook.', icon: 'video', category: 'facebook-ads', isPro: true, isNew: true, isTrending: true, usageCount: 7200, rating: 4.8, inputs: [{ name: 'duration', label: 'Duration', type: 'select', required: true, options: ['15 sec', '30 sec', '60 sec'] }], outputType: 'text', tags: ['video', 'scripts'] },
  { $id: 'm5', name: 'Facebook Retargeting Copy', slug: 'facebook-retargeting', shortDescription: 'Retargeting ad copy', description: 'Re-engage website visitors with compelling copy.', icon: 'repeat', category: 'facebook-ads', isPro: true, isNew: false, isTrending: true, usageCount: 6800, rating: 4.7, inputs: [{ name: 'stage', label: 'Funnel Stage', type: 'select', required: true, options: ['Viewed Product', 'Added to Cart', 'Checkout Abandoned'] }], outputType: 'text', tags: ['retargeting', 'facebook'] },
  // Instagram Category (20 tools)
  { $id: 'm6', name: 'Instagram Caption Generator', slug: 'instagram-captions', shortDescription: 'Engaging IG captions', description: 'Create viral Instagram captions with hashtags.', icon: 'instagram', category: 'instagram', isPro: false, isNew: false, isTrending: true, usageCount: 22000, rating: 4.9, inputs: [{ name: 'topic', label: 'Post Topic', type: 'text', required: true }, { name: 'mood', label: 'Mood', type: 'select', required: true, options: ['Inspiring', 'Funny', 'Educational', 'Promotional'] }], outputType: 'text', tags: ['instagram', 'captions'] },
  { $id: 'm7', name: 'Instagram Reels Script', slug: 'instagram-reels', shortDescription: 'Reels video scripts', description: 'Write scripts for viral Instagram Reels.', icon: 'film', category: 'instagram', isPro: false, isNew: true, isTrending: true, usageCount: 15600, rating: 4.8, inputs: [{ name: 'hook', label: 'Hook/Topic', type: 'text', required: true }], outputType: 'text', tags: ['reels', 'video'] },
  { $id: 'm8', name: 'Instagram Story Ideas', slug: 'instagram-stories', shortDescription: 'Story content ideas', description: 'Generate engaging Instagram Story sequences.', icon: 'circle', category: 'instagram', isPro: false, isNew: false, isTrending: false, usageCount: 8900, rating: 4.6, inputs: [{ name: 'brand', label: 'Brand/Niche', type: 'text', required: true }], outputType: 'text', tags: ['stories', 'ideas'] },
  { $id: 'm9', name: 'Instagram Hashtag Generator', slug: 'instagram-hashtags', shortDescription: 'Relevant hashtags', description: 'Find the best hashtags for maximum reach.', icon: 'hash', category: 'instagram', isPro: false, isNew: false, isTrending: true, usageCount: 19200, rating: 4.7, inputs: [{ name: 'niche', label: 'Your Niche', type: 'text', required: true }], outputType: 'text', tags: ['hashtags', 'reach'] },
  { $id: 'm10', name: 'Instagram Bio Generator', slug: 'instagram-bio', shortDescription: 'Profile bio writer', description: 'Create a compelling Instagram bio.', icon: 'user', category: 'instagram', isPro: false, isNew: false, isTrending: false, usageCount: 12100, rating: 4.6, inputs: [{ name: 'about', label: 'About You/Brand', type: 'textarea', required: true }], outputType: 'text', tags: ['bio', 'profile'] },
  // Social Media Category (16 tools)
  { $id: 'm11', name: 'Social Media Calendar', slug: 'social-calendar', shortDescription: '30-day content plan', description: 'Generate a month of social media content ideas.', icon: 'calendar', category: 'social-media', isPro: true, isNew: false, isTrending: true, usageCount: 9500, rating: 4.8, inputs: [{ name: 'niche', label: 'Business Niche', type: 'text', required: true }], outputType: 'text', tags: ['calendar', 'planning'] },
  { $id: 'm12', name: 'Viral Tweet Generator', slug: 'viral-tweets', shortDescription: 'Twitter/X content', description: 'Create tweets that get engagement.', icon: 'twitter', category: 'social-media', isPro: false, isNew: false, isTrending: true, usageCount: 11800, rating: 4.7, inputs: [{ name: 'topic', label: 'Topic', type: 'text', required: true }], outputType: 'text', tags: ['twitter', 'tweets'] },
  { $id: 'm13', name: 'LinkedIn Post Writer', slug: 'linkedin-posts', shortDescription: 'Professional posts', description: 'Write engaging LinkedIn posts.', icon: 'linkedin', category: 'social-media', isPro: false, isNew: false, isTrending: true, usageCount: 8700, rating: 4.6, inputs: [{ name: 'topic', label: 'Topic', type: 'text', required: true }], outputType: 'text', tags: ['linkedin', 'professional'] },
  // ===== SHOPIFY/E-COMMERCE PLATFORM TOOLS (66 tools) =====
  // Product Listings Category (22 tools)
  { $id: 's1', name: 'Shopify Product Title Optimizer', slug: 'shopify-titles', shortDescription: 'SEO product titles', description: 'Create search-optimized product titles for Shopify.', icon: 'tag', category: 'shopify-products', isPro: false, isNew: false, isTrending: true, usageCount: 14500, rating: 4.8, inputs: [{ name: 'product', label: 'Product Name', type: 'text', required: true }, { name: 'keywords', label: 'Keywords', type: 'text', required: false }], outputType: 'text', tags: ['shopify', 'titles', 'products'] },
  { $id: 's2', name: 'Product Description Generator', slug: 'product-descriptions', shortDescription: 'Compelling descriptions', description: 'Write product descriptions that sell.', icon: 'file-text', category: 'shopify-products', isPro: false, isNew: false, isTrending: true, usageCount: 16800, rating: 4.9, inputs: [{ name: 'product', label: 'Product', type: 'text', required: true }, { name: 'features', label: 'Key Features', type: 'textarea', required: true }], outputType: 'text', tags: ['products', 'descriptions'] },
  { $id: 's3', name: 'Shopify Collection Descriptions', slug: 'shopify-collections', shortDescription: 'Collection page copy', description: 'Write engaging collection descriptions.', icon: 'folder', category: 'shopify-products', isPro: false, isNew: false, isTrending: false, usageCount: 5600, rating: 4.5, inputs: [{ name: 'collection', label: 'Collection Name', type: 'text', required: true }], outputType: 'text', tags: ['collections', 'shopify'] },
  { $id: 's4', name: 'Product Bullet Points', slug: 'product-bullets', shortDescription: 'Feature bullet points', description: 'Generate scannable product features.', icon: 'list', category: 'shopify-products', isPro: false, isNew: false, isTrending: true, usageCount: 8900, rating: 4.7, inputs: [{ name: 'features', label: 'Product Features', type: 'textarea', required: true }], outputType: 'text', tags: ['bullets', 'features'] },
  { $id: 's5', name: 'Amazon Listing Optimizer', slug: 'amazon-listings', shortDescription: 'Amazon product copy', description: 'Optimize listings for Amazon marketplace.', icon: 'shopping-bag', category: 'shopify-products', isPro: true, isNew: false, isTrending: true, usageCount: 7200, rating: 4.6, inputs: [{ name: 'product', label: 'Product', type: 'text', required: true }], outputType: 'text', tags: ['amazon', 'listings'] },
  // Shopping Ads Category (18 tools)
  { $id: 's6', name: 'Google Shopping Title Optimizer', slug: 'shopping-titles', shortDescription: 'Shopping feed titles', description: 'Optimize titles for Google Shopping.', icon: 'shopping-cart', category: 'shopify-ads', isPro: true, isNew: false, isTrending: true, usageCount: 6800, rating: 4.7, inputs: [{ name: 'title', label: 'Current Title', type: 'text', required: true }], outputType: 'text', tags: ['shopping', 'google'] },
  { $id: 's7', name: 'Facebook Dynamic Ads Copy', slug: 'facebook-dynamic', shortDescription: 'Dynamic product ads', description: 'Create copy for Facebook dynamic product ads.', icon: 'refresh-cw', category: 'shopify-ads', isPro: true, isNew: false, isTrending: false, usageCount: 4500, rating: 4.5, inputs: [{ name: 'catalog', label: 'Product Category', type: 'text', required: true }], outputType: 'text', tags: ['dynamic', 'facebook'] },
  // Email Marketing Category (14 tools)
  { $id: 's8', name: 'Abandoned Cart Email', slug: 'abandoned-cart', shortDescription: 'Recovery emails', description: 'Win back abandoned cart customers.', icon: 'shopping-cart', category: 'email-marketing', isPro: false, isNew: false, isTrending: true, usageCount: 11200, rating: 4.8, inputs: [{ name: 'product', label: 'Product Type', type: 'text', required: true }], outputType: 'text', tags: ['email', 'cart', 'recovery'] },
  { $id: 's9', name: 'Welcome Email Sequence', slug: 'welcome-emails', shortDescription: 'New subscriber emails', description: 'Create a 5-email welcome sequence.', icon: 'mail', category: 'email-marketing', isPro: true, isNew: false, isTrending: true, usageCount: 8700, rating: 4.7, inputs: [{ name: 'brand', label: 'Brand Name', type: 'text', required: true }], outputType: 'text', tags: ['welcome', 'sequence'] },
  { $id: 's10', name: 'Product Launch Email', slug: 'launch-emails', shortDescription: 'Launch announcements', description: 'Create buzz for new product launches.', icon: 'send', category: 'email-marketing', isPro: false, isNew: false, isTrending: false, usageCount: 6400, rating: 4.6, inputs: [{ name: 'product', label: 'New Product', type: 'text', required: true }], outputType: 'text', tags: ['launch', 'email'] },
  { $id: 's11', name: 'Email Subject Line Generator', slug: 'email-subjects', shortDescription: 'High open-rate subjects', description: 'Generate attention-grabbing subject lines.', icon: 'at-sign', category: 'email-marketing', isPro: false, isNew: false, isTrending: true, usageCount: 13500, rating: 4.8, inputs: [{ name: 'topic', label: 'Email Topic', type: 'text', required: true }], outputType: 'text', tags: ['subjects', 'email'] },
  // E-commerce SEO Category (12 tools)
  { $id: 's12', name: 'E-commerce Category SEO', slug: 'ecom-category-seo', shortDescription: 'Category page SEO', description: 'Optimize category pages for search.', icon: 'search', category: 'ecommerce-seo', isPro: true, isNew: false, isTrending: false, usageCount: 4200, rating: 4.5, inputs: [{ name: 'category', label: 'Category Name', type: 'text', required: true }], outputType: 'text', tags: ['seo', 'categories'] },
  { $id: 's13', name: 'Product Review Response', slug: 'review-response', shortDescription: 'Review reply templates', description: 'Respond professionally to customer reviews.', icon: 'message-square', category: 'ecommerce-seo', isPro: false, isNew: true, isTrending: false, usageCount: 3800, rating: 4.4, inputs: [{ name: 'review', label: 'Customer Review', type: 'textarea', required: true }], outputType: 'text', tags: ['reviews', 'responses'] },
  // ===== AI MARKETING AGENTS (10 tools) =====
  { $id: 'a1', name: 'AI Campaign Optimizer', slug: 'ai-campaign-optimizer', shortDescription: '24/7 campaign optimization', description: 'AI agent that continuously optimizes your campaigns.', icon: 'cpu', category: 'ai-agents', isPro: true, isNew: true, isTrending: true, usageCount: 4500, rating: 4.9, inputs: [{ name: 'campaign', label: 'Campaign Type', type: 'select', required: true, options: ['Google Ads', 'Facebook Ads', 'Email'] }], outputType: 'text', tags: ['ai', 'automation', 'optimization'] },
  { $id: 'a2', name: 'AI Content Planner', slug: 'ai-content-planner', shortDescription: 'Automated content strategy', description: 'AI agent for content planning and scheduling.', icon: 'calendar', category: 'ai-agents', isPro: true, isNew: true, isTrending: true, usageCount: 3800, rating: 4.8, inputs: [{ name: 'niche', label: 'Business Niche', type: 'text', required: true }], outputType: 'text', tags: ['ai', 'content', 'planning'] },
  { $id: 'a3', name: 'AI Chatbot Builder', slug: 'ai-chatbot', shortDescription: 'Custom support chatbots', description: 'Create AI chatbots for customer support.', icon: 'message-circle', category: 'ai-agents', isPro: true, isNew: true, isTrending: true, usageCount: 5200, rating: 4.7, inputs: [{ name: 'business', label: 'Business Description', type: 'textarea', required: true }], outputType: 'text', tags: ['chatbot', 'support', 'ai'] },
  { $id: 'a4', name: 'AI Performance Analyzer', slug: 'ai-analyzer', shortDescription: 'Smart analytics insights', description: 'AI agent that analyzes and reports on performance.', icon: 'activity', category: 'ai-agents', isPro: true, isNew: false, isTrending: false, usageCount: 2900, rating: 4.6, inputs: [{ name: 'metric', label: 'Focus Area', type: 'select', required: true, options: ['ROI', 'Traffic', 'Conversions', 'Engagement'] }], outputType: 'text', tags: ['analytics', 'ai'] },
  { $id: 'a5', name: 'AI Budget Optimizer', slug: 'ai-budget', shortDescription: 'Smart budget allocation', description: 'AI agent for optimal ad spend distribution.', icon: 'dollar-sign', category: 'ai-agents', isPro: true, isNew: true, isTrending: false, usageCount: 2100, rating: 4.5, inputs: [{ name: 'budget', label: 'Monthly Budget', type: 'number', required: true }], outputType: 'text', tags: ['budget', 'optimization', 'ai'] },
  // ===== CONTENT CREATION TOOLS =====
  { $id: 'c1', name: 'Meme Generator', slug: 'meme-generator', shortDescription: 'Create viral memes for marketing', description: 'Create engaging memes with custom text, templates, and images. Perfect for social media marketing, brand awareness, and viral content creation.', icon: 'smile', category: 'content-creation', isPro: false, isNew: true, isTrending: true, usageCount: 28500, rating: 4.9, inputs: [{ name: 'topText', label: 'Top Text', type: 'text', required: false, placeholder: 'Enter top text...' }, { name: 'bottomText', label: 'Bottom Text', type: 'text', required: false, placeholder: 'Enter bottom text...' }], outputType: 'image', tags: ['meme', 'image', 'social', 'viral', 'marketing'] },
  { $id: 'c2', name: 'AI Image Caption', slug: 'ai-image-caption', shortDescription: 'Generate captions for images', description: 'AI-powered image caption generator for social media posts.', icon: 'image', category: 'content-creation', isPro: false, isNew: true, isTrending: true, usageCount: 15200, rating: 4.8, inputs: [{ name: 'context', label: 'Image Context', type: 'textarea', required: true }], outputType: 'text', tags: ['caption', 'image', 'social'] },
  { $id: 'c3', name: 'Quote Image Maker', slug: 'quote-image', shortDescription: 'Create beautiful quote images', description: 'Design shareable quote images for social media.', icon: 'feather', category: 'content-creation', isPro: false, isNew: false, isTrending: true, usageCount: 12800, rating: 4.7, inputs: [{ name: 'quote', label: 'Quote Text', type: 'textarea', required: true }], outputType: 'image', tags: ['quote', 'image', 'design'] },
  { $id: 'c4', name: 'Thumbnail Generator', slug: 'thumbnail-generator', shortDescription: 'YouTube & social thumbnails', description: 'Create eye-catching thumbnails for videos and posts.', icon: 'youtube', category: 'content-creation', isPro: true, isNew: true, isTrending: true, usageCount: 9600, rating: 4.6, inputs: [{ name: 'title', label: 'Video Title', type: 'text', required: true }], outputType: 'image', tags: ['thumbnail', 'youtube', 'video'] },
  { $id: 'c5', name: 'Story Template Designer', slug: 'story-templates', shortDescription: 'Instagram/FB story templates', description: 'Design stunning story templates for social media.', icon: 'layout', category: 'content-creation', isPro: true, isNew: false, isTrending: false, usageCount: 7400, rating: 4.5, inputs: [{ name: 'theme', label: 'Theme', type: 'select', required: true, options: ['Minimal', 'Bold', 'Elegant', 'Fun'] }], outputType: 'image', tags: ['stories', 'templates', 'design'] },

  // --- Popular web tools added for mobile ---

  // Google Ads
  { $id: 'gx1', name: 'Google Ads Budget Calculator', slug: 'google-ads-budget-calculator', shortDescription: 'Calculate optimal ad budgets', description: 'AI-powered budget calculator for Google Ads campaigns.', icon: 'dollar-sign', category: 'google-ads', isPro: false, isNew: false, isTrending: true, usageCount: 11200, rating: 4.8, inputs: [{ name: 'mainInput', label: 'Campaign Details', type: 'textarea', required: true, placeholder: 'Describe your campaign goals...' }, { name: 'targetConversions', label: 'Target Conversions', type: 'number', required: false, placeholder: '100' }, { name: 'industry', label: 'Industry', type: 'select', required: false, options: ['E-commerce', 'SaaS', 'Local Business', 'Healthcare', 'Finance', 'Education'] }], outputType: 'text', tags: ['google', 'budget', 'calculator'] },
  { $id: 'gx2', name: 'Google Ads Grader', slug: 'ads-grader-pro', shortDescription: 'Grade your Google Ads performance', description: 'Get an AI-powered audit of your Google Ads account.', icon: 'award', category: 'google-ads', isPro: true, isNew: false, isTrending: true, usageCount: 9800, rating: 4.7, inputs: [{ name: 'mainInput', label: 'Account Details', type: 'textarea', required: true, placeholder: 'Describe your Google Ads setup...' }], outputType: 'text', tags: ['google', 'audit', 'grader'] },
  { $id: 'gx3', name: 'Google Analytics Grader', slug: 'ga4-grader', shortDescription: 'Audit your GA4 setup', description: 'AI audit of your Google Analytics configuration.', icon: 'bar-chart', category: 'google-analytics', isPro: true, isNew: false, isTrending: false, usageCount: 7200, rating: 4.6, inputs: [{ name: 'mainInput', label: 'Analytics Setup', type: 'textarea', required: true, placeholder: 'Describe your GA4 configuration...' }], outputType: 'text', tags: ['google', 'analytics', 'audit'] },

  // Instagram
  { $id: 'ix1', name: 'Instagram Caption Generator', slug: 'instagram-caption-generator', shortDescription: 'AI-powered Instagram captions', description: 'Generate engaging Instagram captions with hashtags.', icon: 'instagram', category: 'instagram', isPro: false, isNew: false, isTrending: true, usageCount: 22400, rating: 4.9, inputs: [{ name: 'mainInput', label: 'What is your post about?', type: 'textarea', required: true, placeholder: 'Describe your photo or post...' }, { name: 'tone', label: 'Tone', type: 'select', required: false, options: ['Casual', 'Professional', 'Funny', 'Inspirational', 'Promotional'] }], outputType: 'text', tags: ['instagram', 'caption', 'social'] },
  { $id: 'ix2', name: 'Instagram Reels Optimizer', slug: 'instagram-reels-optimizer', shortDescription: 'Optimize Reels for reach', description: 'AI tips and scripts to maximize Instagram Reels performance.', icon: 'video', category: 'instagram', isPro: false, isNew: true, isTrending: true, usageCount: 14600, rating: 4.8, inputs: [{ name: 'mainInput', label: 'Reel Topic', type: 'textarea', required: true, placeholder: 'What is your Reel about?' }, { name: 'reelLength', label: 'Length', type: 'select', required: false, options: ['15 seconds', '30 seconds', '60 seconds', '90 seconds'] }], outputType: 'text', tags: ['instagram', 'reels', 'video'] },

  // Email
  { $id: 'ex1', name: 'Cold Outreach Email', slug: 'cold-outreach-email', shortDescription: 'Write cold outreach emails', description: 'Generate personalized cold outreach emails that get responses.', icon: 'mail', category: 'email-marketing', isPro: false, isNew: false, isTrending: true, usageCount: 16800, rating: 4.8, inputs: [{ name: 'mainInput', label: 'Who are you reaching out to?', type: 'textarea', required: true, placeholder: 'Describe the prospect and your offer...' }, { name: 'subject', label: 'Subject Line Idea', type: 'text', required: false, placeholder: 'Optional subject line...' }], outputType: 'text', tags: ['email', 'outreach', 'cold'] },
  { $id: 'ex2', name: 'Email Writer', slug: 'email-writer', shortDescription: 'Write any marketing email', description: 'AI email writer for any type of marketing email.', icon: 'mail', category: 'email-marketing', isPro: false, isNew: false, isTrending: true, usageCount: 19200, rating: 4.9, inputs: [{ name: 'mainInput', label: 'Email Purpose', type: 'textarea', required: true, placeholder: 'What is this email about?' }, { name: 'subject', label: 'Subject', type: 'text', required: false }, { name: 'cta', label: 'Call to Action', type: 'text', required: false }], outputType: 'text', tags: ['email', 'marketing', 'writer'] },
  { $id: 'ex3', name: 'Product Launch Email Sequence', slug: 'product-launch-email-sequence', shortDescription: 'Launch email series', description: 'Generate a complete product launch email sequence.', icon: 'send', category: 'email-marketing', isPro: true, isNew: false, isTrending: true, usageCount: 11400, rating: 4.7, inputs: [{ name: 'mainInput', label: 'Product Details', type: 'textarea', required: true, placeholder: 'Describe the product being launched...' }], outputType: 'text', tags: ['email', 'launch', 'sequence'] },

  // SEO
  { $id: 'sx1', name: 'Keyword Research Tool', slug: 'keyword-research-tool', shortDescription: 'AI keyword research', description: 'Discover high-value keywords for your content strategy.', icon: 'search', category: 'google-seo', isPro: false, isNew: false, isTrending: true, usageCount: 21600, rating: 4.9, inputs: [{ name: 'seedKeyword', label: 'Seed Keyword', type: 'text', required: true, placeholder: 'Enter a keyword...' }, { name: 'country', label: 'Country', type: 'select', required: false, options: ['United States', 'United Kingdom', 'India', 'Canada', 'Australia', 'Germany'] }], outputType: 'text', tags: ['seo', 'keywords', 'research'] },
  { $id: 'sx2', name: 'Keyword Cluster Generator', slug: 'keyword-cluster-generator', shortDescription: 'Group keywords into clusters', description: 'Organize keywords into topical clusters for content planning.', icon: 'grid', category: 'google-seo', isPro: false, isNew: false, isTrending: true, usageCount: 13200, rating: 4.7, inputs: [{ name: 'keywords', label: 'Keywords', type: 'textarea', required: true, placeholder: 'Enter keywords, one per line...' }], outputType: 'text', tags: ['seo', 'keywords', 'clusters'] },
  { $id: 'sx3', name: 'Long Tail Keyword Generator', slug: 'long-tail-keyword-generator', shortDescription: 'Find long-tail keywords', description: 'Generate long-tail keyword variations for SEO.', icon: 'trending-up', category: 'google-seo', isPro: false, isNew: false, isTrending: false, usageCount: 10800, rating: 4.6, inputs: [{ name: 'seedKeyword', label: 'Seed Keyword', type: 'text', required: true, placeholder: 'Enter base keyword...' }], outputType: 'text', tags: ['seo', 'long-tail', 'keywords'] },

  // Social Media
  { $id: 'smx1', name: 'Hashtag Generator', slug: 'hashtag-generator', shortDescription: 'Generate trending hashtags', description: 'Find the best hashtags for your social media posts.', icon: 'hash', category: 'social-media', isPro: false, isNew: false, isTrending: true, usageCount: 25600, rating: 4.9, inputs: [{ name: 'mainInput', label: 'Post Topic', type: 'textarea', required: true, placeholder: 'What is your post about?' }, { name: 'platform', label: 'Platform', type: 'select', required: false, options: ['Instagram', 'Twitter/X', 'TikTok', 'LinkedIn', 'Facebook'] }], outputType: 'text', tags: ['hashtag', 'social', 'trending'] },
  { $id: 'smx2', name: 'Social Media Post Generator', slug: 'social-media-post-generator', shortDescription: 'Generate social media posts', description: 'Create engaging posts for any social media platform.', icon: 'share-2', category: 'social-media', isPro: false, isNew: false, isTrending: true, usageCount: 20400, rating: 4.8, inputs: [{ name: 'mainInput', label: 'Post Topic', type: 'textarea', required: true, placeholder: 'What do you want to post about?' }, { name: 'platform', label: 'Platform', type: 'select', required: false, options: ['Instagram', 'Facebook', 'Twitter/X', 'LinkedIn', 'TikTok'] }], outputType: 'text', tags: ['social', 'post', 'generator'] },
  { $id: 'smx3', name: 'Caption Creator', slug: 'caption-creator', shortDescription: 'Create captions for any platform', description: 'AI-powered caption creator for social media.', icon: 'type', category: 'social-media', isPro: false, isNew: false, isTrending: false, usageCount: 14800, rating: 4.7, inputs: [{ name: 'mainInput', label: 'Describe your content', type: 'textarea', required: true, placeholder: 'What is the caption for?' }, { name: 'platform', label: 'Platform', type: 'select', required: false, options: ['Instagram', 'Facebook', 'TikTok', 'LinkedIn'] }], outputType: 'text', tags: ['caption', 'social', 'creator'] },

  // E-commerce
  { $id: 'ecx1', name: 'Dynamic Product Ads', slug: 'dynamic-product-ads', shortDescription: 'Dynamic ad copy for products', description: 'Generate dynamic product ad copy for e-commerce.', icon: 'shopping-bag', category: 'shopify-ads', isPro: true, isNew: false, isTrending: true, usageCount: 9200, rating: 4.6, inputs: [{ name: 'mainInput', label: 'Product Details', type: 'textarea', required: true, placeholder: 'Describe the product...' }, { name: 'productName', label: 'Product Name', type: 'text', required: true }], outputType: 'text', tags: ['ecommerce', 'dynamic', 'ads'] },
  { $id: 'ecx2', name: 'Product Feed Optimizer', slug: 'product-feed-optimizer', shortDescription: 'Optimize product feeds', description: 'AI-powered product feed optimization for shopping ads.', icon: 'database', category: 'shopify-ads', isPro: true, isNew: false, isTrending: false, usageCount: 7600, rating: 4.5, inputs: [{ name: 'mainInput', label: 'Product Feed Data', type: 'textarea', required: true, placeholder: 'Paste product title and description...' }], outputType: 'text', tags: ['feed', 'shopping', 'optimizer'] },
  { $id: 'ecx3', name: 'Cart Recovery Ads', slug: 'cart-recovery-ads', shortDescription: 'Abandoned cart ad copy', description: 'Generate compelling abandoned cart recovery ad copy.', icon: 'shopping-cart', category: 'shopify-ads', isPro: false, isNew: false, isTrending: true, usageCount: 11800, rating: 4.7, inputs: [{ name: 'mainInput', label: 'Product/Store Details', type: 'textarea', required: true, placeholder: 'Describe the product left in cart...' }], outputType: 'text', tags: ['cart', 'recovery', 'ecommerce'] },

  // Content Writing
  { $id: 'cwx1', name: 'Blog Post Ideas', slug: 'blog-post-ideas', shortDescription: 'Generate blog topic ideas', description: 'AI-powered blog post idea generator for content marketing.', icon: 'book-open', category: 'google-content', isPro: false, isNew: false, isTrending: true, usageCount: 18400, rating: 4.8, inputs: [{ name: 'mainInput', label: 'Niche/Industry', type: 'textarea', required: true, placeholder: 'What industry or topic?' }], outputType: 'text', tags: ['blog', 'ideas', 'content'] },
  { $id: 'cwx2', name: 'Blog Outline Writer', slug: 'blog-outline-writer', shortDescription: 'Create blog post outlines', description: 'Generate detailed blog post outlines with sections and key points.', icon: 'list', category: 'google-content', isPro: false, isNew: false, isTrending: true, usageCount: 16200, rating: 4.8, inputs: [{ name: 'mainInput', label: 'Blog Topic', type: 'textarea', required: true, placeholder: 'What is the blog about?' }], outputType: 'text', tags: ['blog', 'outline', 'content'] },
  { $id: 'cwx3', name: 'Article Generator', slug: 'article-generator', shortDescription: 'Generate full articles', description: 'AI article writer for blogs, websites, and marketing.', icon: 'file-text', category: 'google-content', isPro: false, isNew: false, isTrending: true, usageCount: 21200, rating: 4.9, inputs: [{ name: 'mainInput', label: 'Article Topic', type: 'textarea', required: true, placeholder: 'What should the article be about?' }, { name: 'tone', label: 'Tone', type: 'select', required: false, options: ['Professional', 'Casual', 'Friendly', 'Formal', 'Persuasive'] }], outputType: 'text', tags: ['article', 'content', 'writer'] },
  { $id: 'cwx4', name: 'Blog Writer', slug: 'blog-writer', shortDescription: 'Write full blog posts', description: 'AI-powered blog post writer for content marketing.', icon: 'edit', category: 'google-content', isPro: true, isNew: false, isTrending: true, usageCount: 19800, rating: 4.9, inputs: [{ name: 'mainInput', label: 'Blog Topic', type: 'textarea', required: true, placeholder: 'What is the blog post about?' }, { name: 'tone', label: 'Tone', type: 'select', required: false, options: ['Professional', 'Casual', 'Friendly', 'Formal'] }], outputType: 'text', tags: ['blog', 'writer', 'content'] },

  // Shopify
  { $id: 'shx1', name: 'Shopify SEO Optimizer', slug: 'shopify-seo-optimizer', shortDescription: 'SEO for Shopify stores', description: 'Optimize your Shopify store for search engines.', icon: 'search', category: 'ecommerce-seo', isPro: false, isNew: false, isTrending: true, usageCount: 12400, rating: 4.7, inputs: [{ name: 'mainInput', label: 'Store/Product Details', type: 'textarea', required: true, placeholder: 'Describe your Shopify store or product...' }], outputType: 'text', tags: ['shopify', 'seo', 'optimizer'] },
  { $id: 'shx2', name: 'Shopify Product Page Enhancer', slug: 'shopify-product-page-enhancer', shortDescription: 'Enhance product pages', description: 'AI suggestions to improve your Shopify product pages.', icon: 'package', category: 'ecommerce-seo', isPro: false, isNew: false, isTrending: false, usageCount: 8600, rating: 4.6, inputs: [{ name: 'mainInput', label: 'Current Product Page', type: 'textarea', required: true, placeholder: 'Paste your product title and description...' }], outputType: 'text', tags: ['shopify', 'product', 'page'] },

  // TikTok
  { $id: 'ttx1', name: 'TikTok Ad Creator', slug: 'tiktok-ad-creator', shortDescription: 'Create TikTok ad scripts', description: 'Generate engaging TikTok ad scripts and captions.', icon: 'video', category: 'social-media', isPro: true, isNew: true, isTrending: true, usageCount: 16400, rating: 4.8, inputs: [{ name: 'mainInput', label: 'Product/Service', type: 'textarea', required: true, placeholder: 'What are you advertising?' }], outputType: 'text', tags: ['tiktok', 'ads', 'video'] },
  { $id: 'ttx2', name: 'TikTok E-commerce Ads', slug: 'tiktok-ecommerce-ad-creator', shortDescription: 'TikTok Shop ad scripts', description: 'Create TikTok Shop and e-commerce ad content.', icon: 'shopping-bag', category: 'social-media', isPro: true, isNew: true, isTrending: true, usageCount: 8900, rating: 4.6, inputs: [{ name: 'mainInput', label: 'Product Details', type: 'textarea', required: true, placeholder: 'Describe the product...' }, { name: 'productName', label: 'Product Name', type: 'text', required: true }], outputType: 'text', tags: ['tiktok', 'ecommerce', 'shop'] },

  // Twitter/X
  { $id: 'twx1', name: 'Twitter Thread Generator', slug: 'twitter-thread-generator', shortDescription: 'Create viral Twitter threads', description: 'Generate engaging Twitter/X threads that drive engagement.', icon: 'message-circle', category: 'social-media', isPro: false, isNew: false, isTrending: true, usageCount: 17200, rating: 4.8, inputs: [{ name: 'mainInput', label: 'Thread Topic', type: 'textarea', required: true, placeholder: 'What is the thread about?' }], outputType: 'text', tags: ['twitter', 'thread', 'social'] },

  // LinkedIn
  { $id: 'lix1', name: 'LinkedIn Ad Copy Generator', slug: 'linkedin-ad-copy-generator', shortDescription: 'LinkedIn ad copy', description: 'Generate professional LinkedIn ad copy for B2B marketing.', icon: 'briefcase', category: 'social-media', isPro: false, isNew: false, isTrending: true, usageCount: 13600, rating: 4.7, inputs: [{ name: 'mainInput', label: 'Ad Details', type: 'textarea', required: true, placeholder: 'What are you promoting on LinkedIn?' }], outputType: 'text', tags: ['linkedin', 'ads', 'b2b'] },

  // Pinterest
  { $id: 'pix1', name: 'Pinterest Ad Generator', slug: 'pinterest-ad-generator', shortDescription: 'Pinterest ad descriptions', description: 'Generate Pinterest ad copy and pin descriptions.', icon: 'image', category: 'social-media', isPro: false, isNew: false, isTrending: false, usageCount: 8200, rating: 4.5, inputs: [{ name: 'mainInput', label: 'Pin Details', type: 'textarea', required: true, placeholder: 'What is the Pinterest ad about?' }], outputType: 'text', tags: ['pinterest', 'ads', 'social'] },

  // YouTube
  { $id: 'ytx1', name: 'YouTube Title Generator', slug: 'youtube-title-generator', shortDescription: 'Generate YouTube titles', description: 'Create click-worthy YouTube video titles.', icon: 'youtube', category: 'content-creation', isPro: false, isNew: false, isTrending: true, usageCount: 19600, rating: 4.9, inputs: [{ name: 'mainInput', label: 'Video Topic', type: 'textarea', required: true, placeholder: 'What is the video about?' }], outputType: 'text', tags: ['youtube', 'title', 'video'] },
  { $id: 'ytx2', name: 'YouTube Description Generator', slug: 'youtube-description-generator', shortDescription: 'Write YouTube descriptions', description: 'Generate SEO-optimized YouTube video descriptions.', icon: 'youtube', category: 'content-creation', isPro: false, isNew: false, isTrending: true, usageCount: 15800, rating: 4.8, inputs: [{ name: 'mainInput', label: 'Video Topic', type: 'textarea', required: true, placeholder: 'What is the video about?' }, { name: 'videoTopic', label: 'Keywords', type: 'text', required: false, placeholder: 'Target keywords...' }], outputType: 'text', tags: ['youtube', 'description', 'seo'] },
];

export const useToolsStore = create<ToolsState>((set, get) => ({
  tools: SAMPLE_TOOLS,
  categories: TOOL_CATEGORIES.map(c => c.id),
  featuredTools: SAMPLE_TOOLS.filter(t => t.isTrending),
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
      // For now, use sample data
      // In production, fetch from Appwrite
      set({ tools: SAMPLE_TOOLS, isLoading: false });
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
      if (!tool) {
        throw new Error('Tool not found');
      }

      const outputCount = inputs.outputCount || 3;

      // Call REAL AI service - no mock, no sample
      const result = await generateAIContent({
        toolSlug: tool.slug,
        toolName: tool.name,
        inputs,
        tone: inputs.tone,
        language: inputs.language,
        outputCount,
      });

      if (!result.success || result.outputs.length === 0) {
        throw new Error(result.error || 'Failed to generate content');
      }

      set({ isGenerating: false });

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
