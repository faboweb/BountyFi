// Image utilities
import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Compress and resize image for upload
 */
export async function compressImage(
  uri: string,
  maxWidth: number = 1920,
  maxHeight: number = 1920,
  quality: number = 0.7
): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [
      {
        resize: {
          width: maxWidth,
          height: maxHeight,
        },
      },
    ],
    {
      compress: quality,
      format: ImageManipulator.SaveFormat.JPEG,
    }
  );
  
  return result.uri;
}

/**
 * Format wallet address for display (truncate middle)
 */
export function formatWalletAddress(address: string, startChars: number = 6, endChars: number = 4): string {
  if (address.length <= startChars + endChars) {
    return address;
  }
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}
