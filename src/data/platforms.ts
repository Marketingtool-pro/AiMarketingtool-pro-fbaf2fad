// Platform collections for phone app — matches web app structure
// 7 platforms, each with sections of tools filtered by badge

export interface PlatformSection {
  key: string;
  title: string;
  subtitle: string;
  icon: string; // Feather icon name
  badges: string[]; // tool.badge values to include
  slugs?: string[]; // specific slugs to include (overrides badges)
}

export interface Platform {
  id: string;
  title: string;
  icon: string; // Feather icon name
  color: string;
  sections: PlatformSection[];
}

export const PLATFORMS_CONFIG: Platform[] = [
  {
    id: 'google',
    title: 'Google Ads',
    icon: 'search',
    color: '#4285F4',
    sections: [
      { key: 'grader', title: 'Google Graders', subtitle: 'Score and analyze your Google accounts', icon: 'bar-chart-2', badges: ['Grader', 'Google Ads'] },
      { key: 'audit', title: 'Audit & Analysis', subtitle: 'Diagnose issues and find opportunities', icon: 'shield', badges: ['Audit'] },
      { key: 'campaign', title: 'Campaign Management', subtitle: 'Build, manage and optimize campaigns', icon: 'zap', badges: ['Campaign'] },
      { key: 'budget', title: 'Budget & Bidding', subtitle: 'Control spend and maximize ROI', icon: 'dollar-sign', badges: ['Budget', 'PPC Optimization'] },
    ],
  },
  {
    id: 'meta',
    title: 'Meta / Facebook',
    icon: 'facebook',
    color: '#1877F2',
    sections: [
      { key: 'ads-management', title: 'Ads Management', subtitle: 'Launch, manage and optimize campaigns', icon: 'zap', badges: ['Facebook/Meta'] },
      { key: 'creative', title: 'Creative & Copy', subtitle: 'Ad creatives, copy and design', icon: 'edit-3', badges: ['Creative'] },
    ],
  },
  {
    id: 'social-media',
    title: 'Social Media',
    icon: 'share-2',
    color: '#E4405F',
    sections: [
      { key: 'instagram', title: 'Instagram', subtitle: 'Reels, Stories & engagement growth', icon: 'instagram', badges: ['Instagram'] },
      { key: 'social', title: 'Social Media', subtitle: 'Cross-platform scheduling & content', icon: 'share-2', badges: ['Social Media'] },
      { key: 'youtube', title: 'YouTube', subtitle: 'Video ads, scripts & optimization', icon: 'youtube', badges: ['YouTube'] },
      { key: 'tiktok', title: 'TikTok', subtitle: 'Short-form video & viral content', icon: 'video', badges: ['TikTok'] },
      { key: 'linkedin', title: 'LinkedIn', subtitle: 'B2B advertising & lead generation', icon: 'linkedin', badges: ['LinkedIn'] },
    ],
  },
  {
    id: 'seo',
    title: 'Content & SEO',
    icon: 'search',
    color: '#34A853',
    sections: [
      { key: 'seo', title: 'SEO Tools', subtitle: 'Search engine optimization', icon: 'search', badges: ['SEO'] },
      { key: 'content', title: 'Content Writing', subtitle: 'Create engaging content', icon: 'edit', badges: ['Content Writing', 'Copywriting'] },
    ],
  },
  {
    id: 'analytics',
    title: 'Analytics',
    icon: 'bar-chart-2',
    color: '#F9AB00',
    sections: [
      { key: 'analytics', title: 'Analytics', subtitle: 'Data-driven insights & tracking', icon: 'bar-chart-2', badges: ['Analytics'] },
      { key: 'roi', title: 'ROI & Attribution', subtitle: 'Track conversions & measure returns', icon: 'trending-up', badges: ['ROI & Attribution'] },
    ],
  },
  {
    id: 'ecommerce',
    title: 'E-commerce',
    icon: 'shopping-bag',
    color: '#96BF48',
    sections: [
      { key: 'shopify', title: 'Shopify Tools', subtitle: 'Store optimization & marketing', icon: 'shopping-bag', badges: ['Shopify'] },
      { key: 'ecommerce', title: 'E-commerce', subtitle: 'Product ads, analytics & automation', icon: 'shopping-cart', badges: ['E-commerce'] },
    ],
  },
  {
    id: 'ai-tools',
    title: 'AI Tools',
    icon: 'cpu',
    color: '#7C3AED',
    sections: [
      { key: 'ai-agents', title: 'AI Agents', subtitle: 'Autonomous AI marketing agents', icon: 'cpu', badges: ['AI Agent'] },
      { key: 'marketing', title: 'Marketing & Ads', subtitle: 'Marketing copy, growth & brand', icon: 'trending-up', badges: ['Marketing', 'Advertising', 'Branding'] },
      { key: 'text-editing', title: 'Text & Content Editing', subtitle: 'Rewrite, expand & improve text', icon: 'edit', badges: ['Text Editing'] },
      { key: 'developer', title: 'Developer & Automation', subtitle: 'APIs, schemas & workflows', icon: 'code', badges: ['Developer', 'Schema', 'Automation'] },
      { key: 'communication', title: 'Email & More', subtitle: 'Email, graders, education & more', icon: 'mail', badges: ['Email', 'Education', 'Pinterest', 'Twitter/X'] },
    ],
  },
];
