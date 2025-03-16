import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function analyzeContent(
  text: string,
  systemPrompt: string,
): Promise<{
  score: number;
  analysis: string;
  suggestedReply: string;
}> {
  try {
    // Add JSON requirement to system prompt if not already present
    const jsonSystemPrompt = systemPrompt.includes("json")
      ? systemPrompt
      : systemPrompt +
        "\nRespond with a JSON object in the following format: { 'score': number between 1-10, 'analysis': string, 'suggestedReply': string }";

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

export async function regenerateReply(
  text: string,
  customPrompt?: string,
): Promise<string> {
  try {
    const defaultPrompt = "You are an AI assistant generating a courteous and factual reply to a Reddit comment or post about AI technology. Generate a 1-2 sentence response that addresses their concerns and provides accurate information.";

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: customPrompt || defaultPrompt,
        },
        {
          role: "user",
          content: text,
        },
      ],
    });

    return response.choices[0].message.content || "No reply generated";
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to generate reply: ${errorMessage}`);
  }
}