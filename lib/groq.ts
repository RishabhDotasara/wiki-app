import Groq from "groq-sdk";

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY || "",
});

/**
 * Uses Groq AI to check whether an article's content is relevant
 * to a user's request (Ask).
 *
 * Returns { relevant, reason } — relevant is true if the article
 * meaningfully addresses the topic requested.
 */
export async function validateArticleRelevance(
  askTitle: string,
  askDescription: string,
  articleTitle: string,
  articleContent: string
): Promise<{ relevant: boolean; reason: string }> {
  // Truncate article content to avoid token limits (keep first ~3000 chars)
  const truncated = articleContent.length > 3000
    ? articleContent.slice(0, 3000) + "\n...[truncated]"
    : articleContent;

  const systemPrompt = `You are a content validator for a university wiki. Your job is to determine whether an article adequately addresses a user's request. Be reasonably lenient — if the article covers the topic even partially, consider it relevant. Only reject if the article is clearly about a completely different topic.

Respond ONLY with valid JSON in this exact format:
{"relevant": true, "reason": "Brief explanation"}`;

  const userPrompt = `## User Request
Title: "${askTitle}"
${askDescription ? `Description: "${askDescription}"` : ""}

## Article Being Linked
Title: "${articleTitle}"
Content:
${truncated}

Does this article address the user's request?`;

  try {
    const response = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: 200,
    });

    const text = response.choices[0]?.message?.content || "";
    
    // Extract JSON from the response (handle markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        relevant: !!parsed.relevant,
        reason: parsed.reason || "No reason provided.",
      };
    }

    return { relevant: false, reason: "AI returned an unparseable response." };
  } catch (err: any) {
    console.error("[Groq] Validation failed:", err.message);
    // If Groq is unavailable, fail open (allow the link)
    return { relevant: true, reason: "AI validation unavailable — skipped." };
  }
}
