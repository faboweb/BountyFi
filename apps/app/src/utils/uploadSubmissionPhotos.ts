/**
 * Upload submission photos to Supabase Storage and return public URLs.
 */
import { supabase } from './supabase';

const BUCKET = 'submission-photos';

export async function uploadSubmissionPhoto(uri: string, suffix: string): Promise<string> {
  const filename = `sub_${Date.now()}_${suffix}.jpg`;
  const response = await fetch(uri);
  const blob = await response.blob();

  const { error } = await supabase.storage.from(BUCKET).upload(filename, blob, {
    contentType: 'image/jpeg',
    upsert: true,
  });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);
  return data.publicUrl;
}

export async function uploadSubmissionPhotos(
  photos: { uri: string; suffix: string }[]
): Promise<string[]> {
  return Promise.all(photos.map((p) => uploadSubmissionPhoto(p.uri, p.suffix)));
}
