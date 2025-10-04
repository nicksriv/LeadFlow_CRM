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

export interface ConversationSummary {
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  sentiment: "positive" | "neutral" | "negative";
  nextSteps: string;
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

/**
 * Summarize email conversation threads using AI
 */
export async function summarizeConversations(
  conversations: Array<{
    subject: string;
    body: string;
    isFromLead: boolean;
    sentAt: Date;
  }>
): Promise<ConversationSummary> {
  if (!conversations || conversations.length === 0) {
    return {
      summary: "No conversations yet.",
      keyPoints: [],
      actionItems: [],
      sentiment: "neutral",
      nextSteps: "Initiate first contact with the lead.",
    };
  }

  const conversationText = conversations
    .sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime())
    .map((c, i) => {
      const direction = c.isFromLead ? "Lead" : "Sales";
      const date = new Date(c.sentAt).toLocaleDateString();
      return `${date} - ${direction}: ${c.subject}\n${c.body}\n`;
    })
    .join("\n---\n");

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: `You are an expert sales assistant. Analyze email conversation threads and provide concise, actionable summaries.

Your summary should include:
1. A brief overview (2-3 sentences)
2. Key points discussed (bullet points)
3. Action items or commitments made
4. Overall sentiment (positive/neutral/negative)
5. Recommended next steps

Respond with JSON in this exact format:
{
  "summary": "2-3 sentence overview of the conversation",
  "keyPoints": ["point 1", "point 2", "point 3"],
  "actionItems": ["action 1", "action 2"],
  "sentiment": "positive" | "neutral" | "negative",
  "nextSteps": "Clear recommendation for what to do next"
}`,
        },
        {
          role: "user",
          content: `Summarize this email conversation thread:\n\n${conversationText}`,
        },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 1024,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    return {
      summary: result.summary || "Unable to generate summary.",
      keyPoints: Array.isArray(result.keyPoints) ? result.keyPoints : [],
      actionItems: Array.isArray(result.actionItems) ? result.actionItems : [],
      sentiment: ["positive", "neutral", "negative"].includes(result.sentiment)
        ? result.sentiment
        : "neutral",
      nextSteps: result.nextSteps || "Follow up with the lead.",
    };
  } catch (error) {
    console.error("Error summarizing conversations:", error);
    return {
      summary: "Error generating summary. Please try again.",
      keyPoints: [],
      actionItems: [],
      sentiment: "neutral",
      nextSteps: "Review conversation manually.",
    };
  }
}

/**
 * Generate AI-powered email response draft
 */
export async function draftEmailResponse(
  leadName: string,
  conversationHistory: string,
  responseType: "follow-up" | "answer-question" | "proposal" | "closing" = "follow-up"
): Promise<{ subject: string; body: string }> {
  const prompts = {
    "follow-up": "Write a friendly follow-up email to check in on their interest and move the conversation forward.",
    "answer-question": "Write a helpful email answering their questions and providing relevant information.",
    proposal: "Write a professional proposal email outlining the solution and next steps.",
    closing: "Write a compelling closing email to encourage them to move forward with the purchase.",
  };

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: `You are an expert sales email writer. Write professional, personalized emails that build relationships and drive conversions.

Guidelines:
- Be warm and personable, not overly formal
- Keep it concise (3-4 paragraphs max)
- Include a clear call-to-action
- Reference specific points from the conversation
- Use the lead's name naturally

Respond with JSON:
{
  "subject": "Email subject line",
  "body": "Email body text"
}`,
        },
        {
          role: "user",
          content: `Write an email to ${leadName}.

Conversation context:
${conversationHistory}

Task: ${prompts[responseType]}`,
        },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 1024,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    return {
      subject: result.subject || `Following up - ${leadName}`,
      body: result.body || `Hi ${leadName},\n\nI wanted to follow up on our conversation.\n\nBest regards`,
    };
  } catch (error) {
    console.error("Error drafting email:", error);
    return {
      subject: `Following up - ${leadName}`,
      body: `Hi ${leadName},\n\nI wanted to follow up on our previous conversation.\n\nLooking forward to hearing from you.\n\nBest regards`,
    };
  }
}
