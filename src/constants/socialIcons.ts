// Glassify Social Media Icons — premium glass-style 3D icons
// Used on Home screen (DashboardScreen) and Chat page

export interface SocialPlatform {
  id: string;
  name: string;
  icon: any; // require() image
  color: string;
  toolSlug?: string; // links to a tool in the app
  category?: string; // tool category filter
  isPro: boolean;
}

const SocialIconImages = {
  facebook: require('../assets/images/social-icons/01_Facebook.png'),
  instagram: require('../assets/images/social-icons/02_Instagram.png'),
  x: require('../assets/images/social-icons/03_X.png'),
  linkedin: require('../assets/images/social-icons/04_LinkedIn.png'),
  youtube: require('../assets/images/social-icons/05_Youtube.png'),
  whatsapp: require('../assets/images/social-icons/06_WhatsApp.png'),
  reddit: require('../assets/images/social-icons/07_Reddit.png'),
  tumblr: require('../assets/images/social-icons/08_Tumblr.png'),
  snapchat: require('../assets/images/social-icons/09_Snapchat.png'),
  pinterest: require('../assets/images/social-icons/10_Pinterest.png'),
  tiktok: require('../assets/images/social-icons/11_TikTok.png'),
  skype: require('../assets/images/social-icons/12_Skype.png'),
  vimeo: require('../assets/images/social-icons/13_Vimeo.png'),
  behance: require('../assets/images/social-icons/14_Behance.png'),
  dribbble: require('../assets/images/social-icons/15_Dribbble.png'),
  flickr: require('../assets/images/social-icons/16_Flickr.png'),
  google: require('../assets/images/social-icons/17_Google.png'),
  soundcloud: require('../assets/images/social-icons/18_SoundCloud.png'),
  spotify: require('../assets/images/social-icons/19_Spotify.png'),
  vine: require('../assets/images/social-icons/20_Vine.png'),
  discord: require('../assets/images/social-icons/21_Discord.png'),
  periscope: require('../assets/images/social-icons/22_Periscope.png'),
  figma: require('../assets/images/social-icons/23_Figma.png'),
  telegram: require('../assets/images/social-icons/24_Telegram.png'),
  medium: require('../assets/images/social-icons/25_Medium.png'),
  messenger: require('../assets/images/social-icons/26_Messenger.png'),
  github: require('../assets/images/social-icons/27_GitHub.png'),
  tinder: require('../assets/images/social-icons/28_Tinder.png'),
  twitch: require('../assets/images/social-icons/29_Twitch.png'),
  slack: require('../assets/images/social-icons/30_Slack.png'),
};

// Primary platforms shown on Home screen — marketing-relevant
export const HOME_PLATFORMS: SocialPlatform[] = [
  { id: 'facebook', name: 'Facebook', icon: SocialIconImages.facebook, color: '#1877F2', toolSlug: 'facebook-ad-copy', category: 'Facebook/Meta', isPro: false },
  { id: 'instagram', name: 'Instagram', icon: SocialIconImages.instagram, color: '#E4405F', toolSlug: 'instagram-caption', category: 'Instagram', isPro: false },
  { id: 'google', name: 'Google', icon: SocialIconImages.google, color: '#4285F4', toolSlug: 'google-ads-headline', category: 'Google Ads', isPro: false },
  { id: 'youtube', name: 'YouTube', icon: SocialIconImages.youtube, color: '#FF0000', toolSlug: 'youtube-video-script', category: 'YouTube', isPro: false },
  { id: 'tiktok', name: 'TikTok', icon: SocialIconImages.tiktok, color: '#000000', toolSlug: 'tiktok-video-script', category: 'TikTok', isPro: true },
  { id: 'linkedin', name: 'LinkedIn', icon: SocialIconImages.linkedin, color: '#0A66C2', toolSlug: 'linkedin-post', category: 'LinkedIn', isPro: true },
  { id: 'x', name: 'X / Twitter', icon: SocialIconImages.x, color: '#000000', toolSlug: 'tweet-generator', category: 'Twitter/X', isPro: true },
  { id: 'pinterest', name: 'Pinterest', icon: SocialIconImages.pinterest, color: '#BD081C', toolSlug: 'pinterest-pin-description', category: 'Pinterest', isPro: true },
  { id: 'whatsapp', name: 'WhatsApp', icon: SocialIconImages.whatsapp, color: '#25D366', toolSlug: 'whatsapp-message', category: 'Social Media', isPro: true },
  { id: 'reddit', name: 'Reddit', icon: SocialIconImages.reddit, color: '#FF5700', toolSlug: 'reddit-post', category: 'Social Media', isPro: true },
  { id: 'telegram', name: 'Telegram', icon: SocialIconImages.telegram, color: '#26A5E4', toolSlug: 'telegram-post', category: 'Social Media', isPro: true },
  { id: 'snapchat', name: 'Snapchat', icon: SocialIconImages.snapchat, color: '#FFFC00', toolSlug: 'snapchat-ad', category: 'Social Media', isPro: true },
];

// Chat page quick platform icons — 7 platforms
export const CHAT_PLATFORMS: SocialPlatform[] = [
  { id: 'facebook', name: 'Facebook', icon: SocialIconImages.facebook, color: '#1877F2', toolSlug: 'facebook-ad-copy', isPro: false },
  { id: 'instagram', name: 'Instagram', icon: SocialIconImages.instagram, color: '#E4405F', toolSlug: 'instagram-caption', isPro: false },
  { id: 'google', name: 'Google', icon: SocialIconImages.google, color: '#4285F4', toolSlug: 'google-ads-headline', isPro: false },
  { id: 'youtube', name: 'YouTube', icon: SocialIconImages.youtube, color: '#FF0000', toolSlug: 'youtube-video-script', isPro: false },
  { id: 'tiktok', name: 'TikTok', icon: SocialIconImages.tiktok, color: '#000000', toolSlug: 'tiktok-video-script', isPro: true },
  { id: 'linkedin', name: 'LinkedIn', icon: SocialIconImages.linkedin, color: '#0A66C2', toolSlug: 'linkedin-post', isPro: true },
  { id: 'x', name: 'X', icon: SocialIconImages.x, color: '#000000', toolSlug: 'tweet-generator', isPro: true },
];

// All platforms (for profile or settings)
export const ALL_PLATFORMS: SocialPlatform[] = [
  { id: 'facebook', name: 'Facebook', icon: SocialIconImages.facebook, color: '#1877F2', isPro: false },
  { id: 'instagram', name: 'Instagram', icon: SocialIconImages.instagram, color: '#E4405F', isPro: false },
  { id: 'x', name: 'X / Twitter', icon: SocialIconImages.x, color: '#000000', isPro: true },
  { id: 'linkedin', name: 'LinkedIn', icon: SocialIconImages.linkedin, color: '#0A66C2', isPro: true },
  { id: 'youtube', name: 'YouTube', icon: SocialIconImages.youtube, color: '#FF0000', isPro: false },
  { id: 'whatsapp', name: 'WhatsApp', icon: SocialIconImages.whatsapp, color: '#25D366', isPro: true },
  { id: 'reddit', name: 'Reddit', icon: SocialIconImages.reddit, color: '#FF5700', isPro: true },
  { id: 'tumblr', name: 'Tumblr', icon: SocialIconImages.tumblr, color: '#36465D', isPro: true },
  { id: 'snapchat', name: 'Snapchat', icon: SocialIconImages.snapchat, color: '#FFFC00', isPro: true },
  { id: 'pinterest', name: 'Pinterest', icon: SocialIconImages.pinterest, color: '#BD081C', isPro: true },
  { id: 'tiktok', name: 'TikTok', icon: SocialIconImages.tiktok, color: '#000000', isPro: true },
  { id: 'skype', name: 'Skype', icon: SocialIconImages.skype, color: '#00AFF0', isPro: true },
  { id: 'vimeo', name: 'Vimeo', icon: SocialIconImages.vimeo, color: '#1AB7EA', isPro: true },
  { id: 'behance', name: 'Behance', icon: SocialIconImages.behance, color: '#1769FF', isPro: true },
  { id: 'dribbble', name: 'Dribbble', icon: SocialIconImages.dribbble, color: '#EA4C89', isPro: true },
  { id: 'flickr', name: 'Flickr', icon: SocialIconImages.flickr, color: '#FF0084', isPro: true },
  { id: 'google', name: 'Google', icon: SocialIconImages.google, color: '#4285F4', isPro: false },
  { id: 'soundcloud', name: 'SoundCloud', icon: SocialIconImages.soundcloud, color: '#FF5500', isPro: true },
  { id: 'spotify', name: 'Spotify', icon: SocialIconImages.spotify, color: '#1DB954', isPro: true },
  { id: 'discord', name: 'Discord', icon: SocialIconImages.discord, color: '#5865F2', isPro: true },
  { id: 'telegram', name: 'Telegram', icon: SocialIconImages.telegram, color: '#26A5E4', isPro: true },
  { id: 'medium', name: 'Medium', icon: SocialIconImages.medium, color: '#000000', isPro: true },
  { id: 'messenger', name: 'Messenger', icon: SocialIconImages.messenger, color: '#0084FF', isPro: true },
  { id: 'github', name: 'GitHub', icon: SocialIconImages.github, color: '#181717', isPro: true },
  { id: 'twitch', name: 'Twitch', icon: SocialIconImages.twitch, color: '#9146FF', isPro: true },
  { id: 'slack', name: 'Slack', icon: SocialIconImages.slack, color: '#4A154B', isPro: true },
  { id: 'figma', name: 'Figma', icon: SocialIconImages.figma, color: '#F24E1E', isPro: true },
];

export function getSocialIcon(platformId: string): any {
  return SocialIconImages[platformId as keyof typeof SocialIconImages] || SocialIconImages.google;
}

export default SocialIconImages;
