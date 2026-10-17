import { Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
// Same file-system entry the rest of the app uses (src/services/imageService.ts).
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { safeFileName } from './actionState';

export async function copyText(text: string): Promise<void> {
  await Clipboard.setStringAsync(text);
}

/**
 * Write the result to a .txt file and open the system share sheet so the user can
 * save it to Files / Drive or send it on. Falls back to sharing the text itself
 * where file sharing is unavailable (e.g. web).
 */
export async function exportTxt(text: string, name: string): Promise<void> {
  const fileName = `${safeFileName(name)}.txt`;
  const canShareFiles = FileSystem.cacheDirectory != null && (await Sharing.isAvailableAsync());
  if (!canShareFiles) {
    await Share.share({ message: text, title: fileName });
    return;
  }
  const uri = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(uri, text, { encoding: FileSystem.EncodingType.UTF8 });
  await Sharing.shareAsync(uri, { mimeType: 'text/plain', dialogTitle: fileName, UTI: 'public.plain-text' });
}
