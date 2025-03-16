import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
export async function analyzeContent(
  text: string,
  systemPrompt: string,
): Promise<{
  score: number;
  analysis: string;
  suggestedReply: string;
}> {
  try {
    // Ensure the prompt requests JSON format
    const jsonSystemPrompt = `${systemPrompt.trim()}
Please analyze the following text and respond with a JSON object containing:
{
  "score": number between 1-10,
  "analysis": string explaining your scoring rationale,
  "suggestedReply": string containing a proposed response
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
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
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    const result = JSON.parse(content);

    // Validate the response structure
    if (typeof result.score !== 'number' || 
        typeof result.analysis !== 'string' || 
        typeof result.suggestedReply !== 'string') {
      throw new Error("Invalid response format from OpenAI");
    }

    return {
      score: Math.max(1, Math.min(10, Math.round(result.score))),
      analysis: result.analysis || "No analysis provided",
      suggestedReply: result.suggestedReply || "No reply suggested",
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("JSON")) {
        throw new Error("Failed to parse OpenAI response as JSON. Please check the system prompt format.");
      }
      throw new Error(`Failed to analyze content: ${error.message}`);
    }
    throw new Error("An unknown error occurred during content analysis");
  }
}

export async function regenerateReply(
  text: string,
  customPrompt?: string,
): Promise<string> {
  try {
    const defaultPrompt =
      "You are an AI assistant generating a courteous and factual reply to a Reddit comment or post about AI technology. Generate a 1-2 sentence response that addresses their concerns and provides accurate information.";

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // Updated to use the latest model
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
      temperature: 0.7, // Add some variation to responses
      max_tokens: 150, // Limit response length
    });

    const reply = response.choices[0].message.content;
    if (!reply) {
      throw new Error("Empty response from OpenAI");
    }

    return reply.trim();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to generate reply: ${errorMessage}`);
  }
}