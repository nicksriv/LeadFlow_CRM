import { bedrock } from "./server/services/bedrock.js";

async function testBedrock() {
    console.log("Testing AWS Bedrock connection...\n");

    console.log("AWS Config:");
    console.log("- Region:", process.env.AWS_REGION || "us-east-1");
    console.log("- Access Key:", process.env.AWS_ACCESS_KEY_ID ? "✓ Set" : "✗ Missing");
    console.log("- Secret Key:", process.env.AWS_SECRET_ACCESS_KEY ? "✓ Set" : "✗ Missing");
    console.log();

    try {
        console.log("Attempting to call Bedrock...");
        const response = await bedrock.chat.completions.create({
            model: "anthropic.claude-3-5-sonnet-20241022-v2:0",
            messages: [
                {
                    role: "user",
                    content: "Say hello in JSON format with a 'message' field.",
                },
            ],
            response_format: { type: "json_object" },
            max_tokens: 100,
        });

        console.log("\n✅ SUCCESS! Bedrock is working.");
        console.log("Response:", response.choices[0].message.content);
    } catch (error: any) {
        console.error("\n❌ ERROR calling Bedrock:");
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);

        if (error.message.includes("AccessDeniedException")) {
            console.error("\n🔒 Access Denied - Possible causes:");
            console.error("1. Model access not requested/approved in AWS Console");
            console.error("2. IAM user lacks bedrock:InvokeModel permission");
            console.error("3. Incorrect credentials");
        } else if (error.message.includes("ValidationException")) {
            console.error("\n⚠️  Validation Error - Check model ID or request format");
        } else if (error.message.includes("ResourceNotFoundException")) {
            console.error("\n🔍 Model Not Found - Model may not be available in your region");
        }

        console.error("\nFull error:", error);
    }
}

testBedrock();
