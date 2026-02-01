/**
 * Upload campaign image to Supabase Storage and return public URL.
 */
import { supabase } from './supabase';

const BUCKET = 'photos';

export async function uploadCampaignImage(uri: string): Promise<string> {
    const filename = `camp_${Date.now()}.jpg`;
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
