import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ExtractedLeadData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  position?: string;
  company?: string;
  location?: string;
  city?: string;
  state?: string;
  country?: string;
  industry?: string;
  linkedinUrl?: string;
  experience?: string;
  education?: string;
  about?: string;
}

/**
 * Extract lead data from LinkedIn screenshot using OpenAI Vision API
 */
export async function extractLeadFromScreenshot(imageBase64: string): Promise<ExtractedLeadData> {
  try {
    console.log("Extracting lead data from LinkedIn screenshot using OpenAI Vision...");

    const prompt = `You are analyzing a LinkedIn profile screenshot. Extract all available information and return it in JSON format.

Extract the following fields if visible:
- firstName: First name of the person
- lastName: Last name of the person
- email: Email address (if visible)
- phone: Phone number (if visible)
- position: Current job title/position
- company: Current company name
- location: Full location string (e.g., "San Francisco, California, United States")
- city: City name extracted from location
- state: State/Province extracted from location
- country: Country extracted from location
- industry: Industry or field
- linkedinUrl: LinkedIn profile URL (if visible)
- experience: Summary of work experience or years of experience
- education: Educational background
- about: About/Summary section text

IMPORTANT:
1. Only extract data that is clearly visible in the screenshot
2. If a field is not visible, omit it from the response
3. For location, parse it into city, state, and country if possible
4. Return ONLY valid JSON, no additional text
5. Use proper capitalization for names

Example response:
{
  "firstName": "John",
  "lastName": "Smith",
  "position": "Senior Software Engineer",
  "company": "Tech Corp",
  "location": "San Francisco, California, United States",
  "city": "San Francisco",
  "state": "California", 
  "country": "United States",
  "industry": "Technology",
  "about": "Passionate software engineer with 10+ years of experience..."
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content?.trim();
    
    if (!content) {
      throw new Error("No response from OpenAI Vision API");
    }

    console.log("OpenAI Vision response:", content);

    // Parse JSON response
    let extractedData: ExtractedLeadData;
    try {
      // Remove markdown code blocks if present
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/```\n?([\s\S]*?)\n?```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      extractedData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse OpenAI response as JSON:", content);
      throw new Error("Failed to parse extracted data. Please ensure the screenshot is clear and shows a LinkedIn profile.");
    }

    return extractedData;
  } catch (error: any) {
    console.error("Error extracting lead from screenshot:", error);
    throw error;
  }
}

/**
 * Map extracted data to lead format
 */
export function mapScreenshotDataToLead(data: ExtractedLeadData): any {
  return {
    // Contact Information
    firstName: data.firstName || "",
    lastName: data.lastName || "",
    email: data.email || "",
    phone: data.phone || "",
    location: data.location || "",
    
    // Work Information
    position: data.position || "",
    department: "",
    industry: data.industry || "",
    experience: data.experience || "",
    
    // Social Profiles
    linkedinUrl: data.linkedinUrl || "",
    twitterUrl: "",
    facebookUrl: "",
    website: "",
    
    // Location Information
    city: data.city || "",
    state: data.state || "",
    country: data.country || "",
    
    // Company Information
    company: data.company || "",
    companyDomain: "",
    companyWebsite: "",
    companyIndustry: data.industry || "",
    companySize: "",
    companyRevenue: "",
    companyFoundedYear: "",
    companyPhone: "",
    companyLinkedin: "",
    
    // Additional fields
    status: "new",
    source: "linkedin_screenshot",
    notes: data.about || data.education || "",
  };
}
