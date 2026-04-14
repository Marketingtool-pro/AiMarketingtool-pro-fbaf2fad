// Loads 314 tools from web app tools.json and maps to phone app Tool format
import rawTools from './tools.json';

export interface WebTool {
  slug: string;
  name: string;
  badge: string;
  badgeColor: string;
  description: string;
  formFields: {
    name: string;
    label: string;
    type: string;
    placeholder?: string;
    required: boolean;
    options?: string[];
  }[];
}

export interface PhoneTool {
  $id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  icon: string;
  category: string;     // badge from web app
  subcategory?: string;
  isPro: boolean;
  isNew: boolean;
  isTrending: boolean;
  usageCount: number;
  rating: number;
  inputs: {
    name: string;
    label: string;
    type: 'text' | 'textarea' | 'select' | 'number' | 'toggle';
    placeholder?: string;
    required: boolean;
    options?: string[];
  }[];
  outputType: 'text' | 'image' | 'code' | 'html';
  tags: string[];
}

// Badge → Feather icon mapping
const BADGE_ICONS: Record<string, string> = {
  'Google Ads': 'target',
  'Facebook/Meta': 'facebook',
  'Instagram': 'instagram',
  'Campaign': 'zap',
  'Analytics': 'bar-chart-2',
  'Audit': 'shield',
  'Content Writing': 'edit',
  'Marketing': 'trending-up',
  'SEO': 'search',
  'AI Agent': 'cpu',
  'Budget': 'dollar-sign',
  'PPC Optimization': 'sliders',
  'Creative': 'image',
  'Social Media': 'share-2',
  'Shopify': 'shopping-bag',
  'E-commerce': 'shopping-cart',
  'Text Editing': 'type',
  'Advertising': 'megaphone',
  'Grader': 'award',
  'ROI & Attribution': 'trending-up',
  'Developer': 'code',
  'Email': 'mail',
  'Copywriting': 'edit-3',
  'YouTube': 'youtube',
  'Branding': 'star',
  'Education': 'book',
  'Schema': 'database',
  'Automation': 'settings',
  'LinkedIn': 'linkedin',
  'Pinterest': 'image',
  'TikTok': 'video',
  'Twitter/X': 'twitter',
};

// Map web formField type to phone input type
const mapFieldType = (type: string): 'text' | 'textarea' | 'select' | 'number' | 'toggle' => {
  switch (type) {
    case 'textarea': return 'textarea';
    case 'select': return 'select';
    case 'number': return 'number';
    default: return 'text';
  }
};

export function loadAllTools(): PhoneTool[] {
  return (rawTools as WebTool[]).map((tool, index) => ({
    $id: `wt-${index}`,
    name: tool.name,
    slug: tool.slug,
    description: tool.description,
    shortDescription: tool.description.substring(0, 80),
    icon: BADGE_ICONS[tool.badge] || 'zap',
    category: tool.badge,
    isPro: tool.badge === 'Audit' || tool.badge === 'Grader' || tool.badge === 'AI Agent' || tool.slug.includes('grader') || tool.slug.includes('audit'),
    isNew: false,
    isTrending: false,
    usageCount: 0,
    rating: 4.5,
    inputs: (tool.formFields || []).map(f => ({
      name: f.name,
      label: f.label,
      type: mapFieldType(f.type),
      placeholder: f.placeholder,
      required: f.required,
      options: f.options,
    })),
    outputType: 'text' as const,
    tags: [tool.badge.toLowerCase(), tool.slug],
  }));
}

// Get unique badges (categories)
export function getAllBadges(): string[] {
  const badges = new Set<string>();
  (rawTools as WebTool[]).forEach(t => badges.add(t.badge));
  return Array.from(badges).sort();
}
