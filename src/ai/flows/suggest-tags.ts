"use server";

/**
 * @fileOverview AI agent that suggests relevant tags for contacts and deals.
 *
 * - suggestTags - A function that suggests tags for a given text.
 * - SuggestTagsInput - The input type for the suggestTags function.
 * - SuggestTagsOutput - The return type for the suggestTags function.
 */

import { ai } from "@/ai/genkit";
import { z } from "genkit";

const SuggestTagsInputSchema = z.object({
  text: z
    .string()
    .describe("The text to suggest tags for, e.g. a description of a contact or deal."),
});
export type SuggestTagsInput = z.infer<typeof SuggestTagsInputSchema>;

const SuggestTagsOutputSchema = z.object({
  tags: z.array(z.string()).describe("An array of suggested tags for the text."),
});
export type SuggestTagsOutput = z.infer<typeof SuggestTagsOutputSchema>;

export async function suggestTags(input: SuggestTagsInput): Promise<SuggestTagsOutput> {
  return suggestTagsFlow(input);
}

const prompt = ai.definePrompt({
  name: "suggestTagsPrompt",
  input: { schema: SuggestTagsInputSchema },
  output: { schema: SuggestTagsOutputSchema },
  prompt: `Suggest relevant tags for the following text.  Return only an array of strings.

Text: {{{text}}}`,
});

const suggestTagsFlow = ai.defineFlow(
  {
    name: "suggestTagsFlow",
    inputSchema: SuggestTagsInputSchema,
    outputSchema: SuggestTagsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
