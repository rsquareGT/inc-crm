'use server';

import { suggestTags as aiSuggestTags, type SuggestTagsInput, type SuggestTagsOutput } from '@/ai/flows/suggest-tags';

interface SuggestTagsResult {
  success: boolean;
  tags?: SuggestTagsOutput['tags'];
  error?: string;
}

export async function suggestTagsAction(input: SuggestTagsInput): Promise<SuggestTagsResult> {
  try {
    const result = await aiSuggestTags(input);
    return { success: true, tags: result.tags };
  } catch (error) {
    console.error("Error suggesting tags via server action:", error);
    let errorMessage = "Failed to suggest tags.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return { success: false, error: errorMessage };
  }
}
