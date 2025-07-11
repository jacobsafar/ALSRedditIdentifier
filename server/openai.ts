import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Helper function to extract sentiment categories from the system prompt
function extractSentimentCategories(systemPrompt: string): string[] {
  const defaultCategories = ["emotional_distress", "physical_challenges", "support_needs", "medical_concerns", "daily_struggles"];
  try {
    // Look for sentiment categories in the prompt
    const categoryMatch = systemPrompt.match(/"sentimentCategory":\s*one of:\s*"([^"]+)"/);
    if (categoryMatch && categoryMatch[1]) {
      return categoryMatch[1].split('", "').map(cat => cat.replace(/"/g, ''));
    }
    return defaultCategories;
  } catch (error) {
    console.error("Error extracting sentiment categories:", error);
    return defaultCategories;
  }
}

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
export async function analyzeContent(
  text: string,
  systemPrompt: string,
): Promise<{
  score: number;
  analysis: string;
  sentimentCategory: string;
}> {
  try {
    // Ensure the prompt requests JSON format
    const jsonSystemPrompt = `${systemPrompt.trim()}
Please analyze the following text and respond with a JSON object containing:
{
  "score": number between 1-10,
  "analysis": string explaining your scoring rationale,
  "sentimentCategory": string indicating the primary sentiment category
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
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
        typeof result.sentimentCategory !== 'string') {
      throw new Error("Invalid response format from OpenAI");
    }

    return {
      score: Math.max(1, Math.min(10, Math.round(result.score))),
      analysis: result.analysis || "No analysis provided",
      sentimentCategory: result.sentimentCategory || "general",
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

export async function categorizeSentiment(
  text: string,
  categories: string[] = ["emotional_distress", "physical_challenges", "support_needs", "medical_concerns", "daily_struggles"]
): Promise<string> {
  try {
    const prompt = `You are an AI assistant categorizing sentiment from ALS patients and their families. 
    Based on the following text, determine which category best describes the primary sentiment:
    Categories: ${categories.join(", ")}
    
    Respond with just the category name that best fits.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: prompt,
        },
        {
          role: "user",
          content: text,
        },
      ],
    });

    const category = response.choices[0].message.content?.trim();
    if (!category) {
      throw new Error("Empty response from OpenAI");
    }

    // Return the category if it's valid, otherwise return "general"
    return categories.includes(category) ? category : "general";
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Failed to categorize sentiment: ${errorMessage}`);
    return "general";
  }
}