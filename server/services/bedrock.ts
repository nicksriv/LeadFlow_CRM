import {
    BedrockRuntimeClient,
    InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

// Initialize Bedrock client
const client = new BedrockRuntimeClient({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
});

// Use cross-region inference profile (required by AWS Bedrock)
const CLAUDE_3_5_SONNET = "us.anthropic.claude-3-5-sonnet-20240620-v1:0";

export interface BedrockMessage {
    role: "user" | "assistant";
    content: string;
}

export interface BedrockChatCompletionOptions {
    model?: string;
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
    max_tokens?: number;
    temperature?: number;
    response_format?: { type: "json_object" };
}

export interface BedrockChatCompletion {
    choices: Array<{
        message: {
            content: string | null;
        };
    }>;
}

/**
 * Bedrock service wrapper that provides an OpenAI-compatible interface
 * for AWS Bedrock's Claude 3.5 Sonnet model
 */
export class BedrockService {
    /**
     * Create a chat completion using Claude 3.5 Sonnet
     * Mimics OpenAI's chat.completions.create() interface
     */
    async createChatCompletion(
        options: BedrockChatCompletionOptions
    ): Promise<BedrockChatCompletion> {
        // Extract system message if present (Claude requires it separate)
        const systemMessage = options.messages.find((m) => m.role === "system");
        const userMessages = options.messages.filter((m) => m.role !== "system");

        // Convert to Claude's message format
        const claudeMessages = userMessages.map((msg) => ({
            role: msg.role as "user" | "assistant",
            content: msg.content,
        }));

        // Build Claude request body
        const requestBody = {
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: options.max_tokens || 4096,
            temperature: options.temperature || 0.7,
            messages: claudeMessages,
            ...(systemMessage && { system: systemMessage.content }),
        };

        // If JSON output is requested, add to system prompt
        if (options.response_format?.type === "json_object") {
            if (requestBody.system) {
                requestBody.system += "\n\nYou MUST respond with valid JSON only. Do not include any explanation or markdown formatting. Return only the JSON object.";
            } else {
                requestBody.system = "You MUST respond with valid JSON only. Do not include any explanation or markdown formatting. Return only the JSON object.";
            }
        }

        try {
            const command = new InvokeModelCommand({
                modelId: options.model || CLAUDE_3_5_SONNET,
                contentType: "application/json",
                accept: "application/json",
                body: JSON.stringify(requestBody),
            });

            const response = await client.send(command);
            const responseBody = JSON.parse(new TextDecoder().decode(response.body));

            // Extract the text content from Claude's response
            let content = "";
            if (responseBody.content && Array.isArray(responseBody.content)) {
                content = responseBody.content
                    .filter((block: any) => block.type === "text")
                    .map((block: any) => block.text)
                    .join("");
            }

            // If JSON was requested, try to extract and sanitize JSON from response
            if (options.response_format?.type === "json_object") {
                // Claude sometimes wraps JSON in markdown code blocks
                const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) ||
                    content.match(/```\n([\s\S]*?)\n```/);
                if (jsonMatch) {
                    content = jsonMatch[1].trim();
                }

                // Extract JSON object if wrapped in text
                const objectMatch = content.match(/\{[\s\S]*\}/);
                if (objectMatch) {
                    content = objectMatch[0];
                }

                // CRITICAL: Fix control characters that break JSON.parse()
                // Claude sometimes includes literal newlines/tabs in string values
                // We need to escape them properly
                content = content
                    .replace(/([^\\])\n/g, '$1\\n')  // Escape unescaped newlines
                    .replace(/([^\\])\r/g, '$1\\r')  // Escape unescaped carriage returns  
                    .replace(/([^\\])\t/g, '$1\\t'); // Escape unescaped tabs

                // Validate it's valid JSON
                try {
                    JSON.parse(content);
                } catch (e) {
                    console.error("Bedrock response is not valid JSON after sanitization:", content);
                    throw new Error("Failed to parse Bedrock JSON response");
                }
            }

            // Return in OpenAI format
            return {
                choices: [
                    {
                        message: {
                            content,
                        },
                    },
                ],
            };
        } catch (error: any) {
            console.error("Bedrock API error:", error);
            throw new Error(`Bedrock API failed: ${error.message}`);
        }
    }
}

// Export singleton instance
export const bedrockService = new BedrockService();

// Helper function to mimic OpenAI's interface
export const bedrock = {
    chat: {
        completions: {
            create: (options: BedrockChatCompletionOptions) =>
                bedrockService.createChatCompletion(options),
        },
    },
};
