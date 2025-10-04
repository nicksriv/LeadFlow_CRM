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

export interface NextBestAction {
  action: string;
  priority: "high" | "medium" | "low";
  reason: string;
  suggestedMessage?: string;
  estimatedImpact: string;
}

export interface SentimentTimelinePoint {
  date: string;
  sentiment: "positive" | "neutral" | "negative";
  score: number;
  summary: string;
  conversationSubject: string;
}

export interface DealForecast {
  winProbability: number;
  lossProbability: number;
  outcome: "likely_win" | "uncertain" | "likely_loss";
  confidence: "high" | "medium" | "low";
  keyFactors: {
    positive: string[];
    negative: string[];
  };
  recommendations: string[];
  estimatedCloseDate: string | null;
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

/**
 * Analyze sentiment over time from conversation history
 */
export async function analyzeSentimentTimeline(
  conversations: Array<{
    subject: string;
    body: string;
    isFromLead: boolean;
    sentAt: Date;
  }>
): Promise<SentimentTimelinePoint[]> {
  if (!conversations || conversations.length === 0) {
    return [];
  }

  const conversationsSorted = conversations
    .sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());

  try {
    const conversationList = conversationsSorted
      .map((c, i) => {
        const direction = c.isFromLead ? "Lead" : "Sales";
        const date = new Date(c.sentAt).toLocaleDateString();
        return `${i + 1}. ${date} - ${direction}: "${c.subject}"\n${c.body.substring(0, 300)}...\n`;
      })
      .join("\n");

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: `You are an expert at analyzing sentiment in sales conversations. For each conversation, analyze the sentiment and provide:
- Sentiment classification (positive/neutral/negative)
- Numeric sentiment score (-10 to +10, where -10 is very negative, 0 is neutral, +10 is very positive)
- Brief summary of the sentiment expressed

Respond with JSON array:
[
  {
    "conversationIndex": number (1-based index),
    "sentiment": "positive" | "neutral" | "negative",
    "score": number (-10 to +10),
    "summary": "Brief explanation of the sentiment"
  }
]`,
        },
        {
          role: "user",
          content: `Analyze the sentiment for each of these conversations:\n\n${conversationList}`,
        },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 2048,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    const sentimentArray = result.sentiments || [];

    return conversationsSorted.map((conv, index) => {
      const sentimentData = sentimentArray.find((s: any) => s.conversationIndex === index + 1) || {
        sentiment: "neutral",
        score: 0,
        summary: "No sentiment data available",
      };

      return {
        date: new Date(conv.sentAt).toISOString(),
        sentiment: ["positive", "neutral", "negative"].includes(sentimentData.sentiment)
          ? sentimentData.sentiment
          : "neutral",
        score: Math.max(-10, Math.min(10, sentimentData.score || 0)),
        summary: sentimentData.summary || "No analysis available",
        conversationSubject: conv.subject,
      };
    });
  } catch (error) {
    console.error("Error analyzing sentiment timeline:", error);
    return conversationsSorted.map((conv) => ({
      date: new Date(conv.sentAt).toISOString(),
      sentiment: "neutral" as const,
      score: 0,
      summary: "Error analyzing sentiment",
      conversationSubject: conv.subject,
    }));
  }
}

/**
 * Generate next-best-action recommendation for a lead
 */
export async function generateNextBestAction(
  leadData: {
    name: string;
    email: string;
    company: string;
    score: number;
    status: string;
  },
  conversations: Array<{
    subject: string;
    body: string;
    isFromLead: boolean;
    sentAt: Date;
  }>,
  recentActivities: Array<{
    type: string;
    description: string;
    createdAt: Date;
  }>,
  openTasks: Array<{
    title: string;
    priority: string;
    dueDate: Date | null;
  }>
): Promise<NextBestAction> {
  const lastConversation = conversations.length > 0
    ? conversations[conversations.length - 1]
    : null;

  const daysSinceLastContact = lastConversation
    ? Math.floor((Date.now() - new Date(lastConversation.sentAt).getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  const conversationSummary = conversations.slice(-3)
    .map((c) => {
      const dir = c.isFromLead ? "Lead" : "Sales";
      return `${dir}: ${c.subject}`;
    })
    .join(", ");

  const activitiesSummary = recentActivities.slice(0, 5)
    .map((a) => `${a.type}: ${a.description}`)
    .join(", ");

  const tasksSummary = openTasks
    .map((t) => `${t.priority} priority: ${t.title}`)
    .join(", ");

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: `You are an expert sales strategist. Analyze a lead's current state and recommend the single most impactful next action.

Available actions:
- send_email: Send a personalized email
- schedule_call: Schedule a phone/video call
- send_proposal: Create and send a proposal
- convert_to_deal: Move lead to sales pipeline
- create_task: Create a follow-up task
- nurture: Add to nurture campaign
- close_lost: Mark as lost opportunity
- escalate: Escalate to manager
- send_demo: Offer product demo

Consider:
- Lead score and engagement level
- Days since last contact
- Conversation sentiment and content
- Open tasks and commitments
- Stage in buyer journey

Respond with JSON:
{
  "action": "action name from the list above",
  "priority": "high" | "medium" | "low",
  "reason": "Clear explanation why this is the best action",
  "suggestedMessage": "Optional: Brief suggested message or talking points",
  "estimatedImpact": "Predicted impact on conversion likelihood"
}`,
        },
        {
          role: "user",
          content: `Recommend next action for this lead:

Lead: ${leadData.name} (${leadData.email}) at ${leadData.company}
Score: ${leadData.score}/100 (${leadData.status})
Days since last contact: ${daysSinceLastContact}

Recent conversations: ${conversationSummary || "None"}
Recent activities: ${activitiesSummary || "None"}
Open tasks: ${tasksSummary || "None"}

What should we do next?`,
        },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 1024,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    return {
      action: result.action || "send_email",
      priority: ["high", "medium", "low"].includes(result.priority) ? result.priority : "medium",
      reason: result.reason || "Follow up with the lead to maintain engagement",
      suggestedMessage: result.suggestedMessage,
      estimatedImpact: result.estimatedImpact || "Moderate impact expected",
    };
  } catch (error) {
    console.error("Error generating next best action:", error);
    return {
      action: "send_email",
      priority: "medium",
      reason: "Send a follow-up email to re-engage the lead",
      suggestedMessage: "Check in on their interest and offer to answer any questions",
      estimatedImpact: "Maintains relationship and keeps lead warm",
    };
  }
}

/**
 * Predict deal outcome (win/loss) using AI analysis
 */
export async function predictDealOutcome(
  dealData: {
    name: string;
    amount: number;
    probability: number;
    stageName: string;
    daysInStage: number;
    daysUntilExpectedClose: number;
  },
  conversationSentiment: {
    averageScore: number;
    recentSentiment: "positive" | "neutral" | "negative";
  },
  engagementMetrics: {
    totalConversations: number;
    lastContactDays: number;
    stageChanges: number;
  }
): Promise<DealForecast> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: `You are an expert sales forecasting analyst. Predict the likelihood of winning or losing a deal based on comprehensive data analysis.

Consider these critical factors:
1. Deal value and configured probability
2. Time spent in current stage (velocity)
3. Conversation sentiment and engagement
4. Days until expected close
5. Stage progression history
6. Recent contact patterns

Provide:
- Win probability (0-100%)
- Loss probability (0-100%, should sum to ~100 with win probability)
- Overall outcome classification
- Confidence level in prediction
- Key positive and negative factors
- Actionable recommendations

Respond with JSON:
{
  "winProbability": number (0-100),
  "lossProbability": number (0-100),
  "outcome": "likely_win" | "uncertain" | "likely_loss",
  "confidence": "high" | "medium" | "low",
  "keyFactors": {
    "positive": ["factor 1", "factor 2"],
    "negative": ["factor 1", "factor 2"]
  },
  "recommendations": ["action 1", "action 2", "action 3"],
  "estimatedCloseDate": "YYYY-MM-DD or null"
}`,
        },
        {
          role: "user",
          content: `Predict outcome for this deal:

Deal: ${dealData.name}
Value: $${dealData.amount}
Current Probability: ${dealData.probability}%
Stage: ${dealData.stageName}
Days in current stage: ${dealData.daysInStage}
Days until expected close: ${dealData.daysUntilExpectedClose}

Conversation Metrics:
- Average sentiment score: ${conversationSentiment.averageScore}/10
- Recent sentiment: ${conversationSentiment.recentSentiment}
- Total conversations: ${engagementMetrics.totalConversations}
- Days since last contact: ${engagementMetrics.lastContactDays}
- Stage changes: ${engagementMetrics.stageChanges}

Provide win/loss prediction with analysis.`,
        },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 1536,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    const winProb = Math.max(0, Math.min(100, result.winProbability || 50));
    const lossProb = Math.max(0, Math.min(100, result.lossProbability || (100 - winProb)));

    let outcome: "likely_win" | "uncertain" | "likely_loss" = "uncertain";
    if (winProb >= 65) outcome = "likely_win";
    else if (winProb <= 35) outcome = "likely_loss";

    return {
      winProbability: winProb,
      lossProbability: lossProb,
      outcome,
      confidence: ["high", "medium", "low"].includes(result.confidence)
        ? result.confidence
        : "medium",
      keyFactors: {
        positive: Array.isArray(result.keyFactors?.positive)
          ? result.keyFactors.positive
          : [],
        negative: Array.isArray(result.keyFactors?.negative)
          ? result.keyFactors.negative
          : [],
      },
      recommendations: Array.isArray(result.recommendations)
        ? result.recommendations
        : ["Continue engagement and monitor progress"],
      estimatedCloseDate: result.estimatedCloseDate || null,
    };
  } catch (error) {
    console.error("Error predicting deal outcome:", error);
    return {
      winProbability: 50,
      lossProbability: 50,
      outcome: "uncertain",
      confidence: "low",
      keyFactors: {
        positive: ["Deal is active"],
        negative: ["Insufficient data for accurate prediction"],
      },
      recommendations: ["Increase engagement", "Update deal information", "Monitor progress closely"],
      estimatedCloseDate: null,
    };
  }
}
