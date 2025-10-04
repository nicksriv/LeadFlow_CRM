import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface LeadScoreAnalysis {
  score: number;
  status: "cold" | "warm" | "hot";
  factors: {
    sentiment: number;
    engagement: number;
    intent: number;
    urgency: number;
    context: string;
  };
}

export async function analyzeLeadConversations(
  leadName: string,
  leadEmail: string,
  conversations: Array<{
    subject: string;
    body: string;
    isFromLead: boolean;
    sentAt: Date;
  }>
): Promise<LeadScoreAnalysis> {
  if (!conversations || conversations.length === 0) {
    return {
      score: 25,
      status: "cold",
      factors: {
        sentiment: 3,
        engagement: 2,
        intent: 2,
        urgency: 2,
        context: "No conversation history available yet. Initial score assigned.",
      },
    };
  }

  const conversationSummary = conversations
    .map((c, i) => {
      const direction = c.isFromLead ? "FROM LEAD" : "TO LEAD";
      return `[${direction}] ${c.subject}\n${c.body.substring(0, 500)}...\n`;
    })
    .join("\n---\n");

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: `You are an expert sales analyst specializing in lead qualification and scoring. Analyze email conversations between a sales team and a lead to determine the lead's quality and likelihood to convert.

Score each factor from 1-10:
- Sentiment: Positive, neutral, or negative tone
- Engagement: Response frequency and depth
- Intent: Buying signals and interest level
- Urgency: Timeline and immediacy

Calculate an overall score (0-100) where:
- 0-33: Cold lead (low interest, minimal engagement)
- 34-66: Warm lead (showing interest, moderate engagement)
- 67-100: Hot lead (strong intent, high engagement, ready to convert)

Respond with JSON in this exact format:
{
  "score": number (0-100),
  "status": "cold" | "warm" | "hot",
  "sentiment": number (1-10),
  "engagement": number (1-10),
  "intent": number (1-10),
  "urgency": number (1-10),
  "context": "brief explanation of the score"
}`,
        },
        {
          role: "user",
          content: `Analyze this lead's email conversation history:

Lead: ${leadName} (${leadEmail})

Conversation History:
${conversationSummary}

Provide a comprehensive lead score analysis.`,
        },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 1024,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    const score = Math.max(0, Math.min(100, result.score || 25));
    let status: "cold" | "warm" | "hot" = "cold";
    if (score >= 67) status = "hot";
    else if (score >= 34) status = "warm";

    return {
      score,
      status,
      factors: {
        sentiment: Math.max(1, Math.min(10, result.sentiment || 5)),
        engagement: Math.max(1, Math.min(10, result.engagement || 5)),
        intent: Math.max(1, Math.min(10, result.intent || 5)),
        urgency: Math.max(1, Math.min(10, result.urgency || 5)),
        context: result.context || "Analysis completed",
      },
    };
  } catch (error) {
    console.error("Error analyzing lead:", error);
    return {
      score: 25,
      status: "cold",
      factors: {
        sentiment: 5,
        engagement: 3,
        intent: 3,
        urgency: 3,
        context: "Error during analysis. Default score assigned.",
      },
    };
  }
}
