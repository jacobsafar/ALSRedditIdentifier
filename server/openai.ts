import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function analyzeContent(text: string, systemPrompt: string): Promise<{
  score: number;
  analysis: string;
  suggestedReply: string;
}> {
  try {
    // Add JSON requirement to system prompt if not already present
    const jsonSystemPrompt = systemPrompt.includes('json') 
      ? systemPrompt 
      : systemPrompt + "\nRespond with a JSON object in the following format: { 'score': number between 1-10, 'analysis': string, 'suggestedReply': string }";

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: jsonSystemPrompt,
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