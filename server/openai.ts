import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024
export async function analyzeContent(text: string, systemPrompt: string): Promise<{
  score: number;
  analysis: string;
  suggestedReply: string;
}> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: text,
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content || "{}";
    const result = JSON.parse(content);

    return {
      score: Math.max(1, Math.min(10, Math.round(result.score))),
      analysis: result.analysis || "No analysis provided",
      suggestedReply: result.suggestedReply || "No reply suggested",
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to analyze content: ${errorMessage}`);
  }
}