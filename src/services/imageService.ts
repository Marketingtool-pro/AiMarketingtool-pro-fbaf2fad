// Real image generation for social media tools — calls the Appwrite
// `image-generator` function (VPS 1, sibling of tool-executor), which hits
// Gemini's image model directly and returns an actual image plus a
// ready-to-post caption. Sync execution, executable by 'any' — works for
// every login type with zero Firebase dependency (architecture: everything
// through Appwrite on VPS 1).
import { ExecutionMethod } from 'react-native-appwrite';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { functions } from './appwrite';

export interface GeneratedImage {
  /** data:image/png;base64,... */
  image: string;
  caption: string;
  model: string;
}

export const imageService = {
  async generateImage(params: {
    prompt: string;
    toolSlug?: string;
    style?: string;
    platform?: 'instagram-post' | 'instagram-story' | 'reel-cover';
    userId?: string;
  }): Promise<GeneratedImage> {
    // Sync execution — result arrives in this response (same pattern as the
    // text tools fix: no polling, no executions.read scope needed).
    const execution = await functions.createExecution(
      'image-generator',
      JSON.stringify(params),
      false,
      '/',
      ExecutionMethod.POST,
    );
    let data: (GeneratedImage & { success: boolean; error?: string }) | null = null;
    try {
      data = JSON.parse(execution.responseBody);
    } catch {
      throw new Error('Image generation returned an invalid response.');
    }
    if (!data?.success || !data.image) {
      throw new Error(data?.error || 'Image generation failed. Please try again.');
    }
    return data;
  },

  /** Write the data-URI image to a shareable file and return its path. */
  async toFile(dataUri: string, name = 'marketingtool-image.png'): Promise<string> {
    const base64 = dataUri.replace(/^data:image\/\w+;base64,/, '');
    const path = `${FileSystem.cacheDirectory}${name}`;
    await FileSystem.writeAsStringAsync(path, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return path;
  },

  /** Open the share sheet (user can pick Instagram, WhatsApp, etc.). */
  async share(dataUri: string): Promise<void> {
    const path = await this.toFile(dataUri);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(path, { mimeType: 'image/png', dialogTitle: 'Share your creative' });
    }
  },
};
