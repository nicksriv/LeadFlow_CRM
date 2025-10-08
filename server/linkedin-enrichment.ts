import type { Request, Response } from "express";

interface LinkedInProfileData {
  firstName?: string;
  lastName?: string;
  headline?: string;
  summary?: string;
  location?: string;
  industry?: string;
  position?: string;
  company?: string;
  email?: string;
  phone?: string;
  linkedinUrl?: string;
  photoUrl?: string;
  experience?: Array<{
    title: string;
    company: string;
    startDate?: string;
    endDate?: string;
    description?: string;
  }>;
  education?: Array<{
    school: string;
    degree?: string;
    field?: string;
    startYear?: number;
    endYear?: number;
  }>;
  skills?: string[];
}

/**
 * Extract LinkedIn username from various LinkedIn URL formats
 */
export function extractLinkedInUsername(url: string): string | null {
  try {
    // Handle various LinkedIn URL formats:
    // https://www.linkedin.com/in/username/
    // https://linkedin.com/in/username
    // linkedin.com/in/username
    // www.linkedin.com/in/username
    const patterns = [
      /linkedin\.com\/in\/([^/?]+)/i,
      /linkedin\.com\/pub\/([^/?]+)/i,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return null;
  } catch (error) {
    console.error("Error extracting LinkedIn username:", error);
    return null;
  }
}

/**
 * Fetch LinkedIn profile data using RapidAPI Fresh LinkedIn Scraper
 */
export async function fetchLinkedInProfile(linkedinUrl: string): Promise<LinkedInProfileData | null> {
  const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
  
  if (!RAPIDAPI_KEY) {
    throw new Error("RAPIDAPI_KEY is not configured. Please add it to your secrets.");
  }

  const username = extractLinkedInUsername(linkedinUrl);
  if (!username) {
    throw new Error("Invalid LinkedIn URL format");
  }

  try {
    console.log(`Fetching LinkedIn profile for username: ${username}`);
    
    const response = await fetch(
      `https://fresh-linkedin-profile-data.p.rapidapi.com/get-linkedin-profile?linkedin_url=${encodeURIComponent(linkedinUrl)}&include_skills=true`,
      {
        method: "GET",
        headers: {
          "X-RapidAPI-Key": RAPIDAPI_KEY,
          "X-RapidAPI-Host": "fresh-linkedin-profile-data.p.rapidapi.com",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("RapidAPI error:", response.status, errorText);
      throw new Error(`Failed to fetch LinkedIn profile: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log("LinkedIn profile data received:", JSON.stringify(data).substring(0, 200));

    // Map RapidAPI response to our internal format
    return mapRapidAPIResponse(data, linkedinUrl);
  } catch (error: any) {
    console.error("Error fetching LinkedIn profile:", error);
    throw error;
  }
}

/**
 * Map RapidAPI response to our internal LinkedIn profile format
 */
function mapRapidAPIResponse(data: any, originalUrl: string): LinkedInProfileData {
  // Extract name parts
  const fullName = data.full_name || data.name || "";
  const nameParts = fullName.split(" ");
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  // Extract location parts
  const locationStr = data.location || data.city || "";
  const locationParts = locationStr.split(",").map((s: string) => s.trim());

  // Extract current position and company
  const currentExperience = data.experiences?.[0] || data.position_groups?.[0]?.profile_positions?.[0];
  const position = currentExperience?.title || data.headline || "";
  const company = currentExperience?.company || currentExperience?.company_name || "";

  return {
    firstName,
    lastName,
    headline: data.headline || position,
    summary: data.summary || data.about || "",
    location: locationParts[0] || locationStr,
    industry: data.industry || "",
    position,
    company,
    email: data.email || "",
    phone: data.phone || data.phone_numbers?.[0] || "",
    linkedinUrl: originalUrl,
    photoUrl: data.profile_pic_url || data.photo_url || "",
    experience: (data.experiences || data.position_groups || []).map((exp: any) => ({
      title: exp.title || exp.profile_positions?.[0]?.title || "",
      company: exp.company || exp.company_name || exp.profile_positions?.[0]?.company || "",
      startDate: exp.start_date || exp.starts_at || "",
      endDate: exp.end_date || exp.ends_at || "",
      description: exp.description || "",
    })),
    education: (data.education || []).map((edu: any) => ({
      school: edu.school || edu.school_name || "",
      degree: edu.degree || edu.degree_name || "",
      field: edu.field_of_study || "",
      startYear: edu.start_year || edu.starts_at?.year,
      endYear: edu.end_year || edu.ends_at?.year,
    })),
    skills: data.skills || [],
  };
}

/**
 * Map LinkedIn profile data to Lead data structure
 */
export function mapLinkedInProfileToLead(profile: LinkedInProfileData): any {
  const locationParts = (profile.location || "").split(",").map(s => s.trim());
  const city = locationParts[0] || "";
  const state = locationParts[1] || "";

  return {
    // Contact Information
    firstName: profile.firstName || "",
    lastName: profile.lastName || "",
    email: profile.email || "",
    phone: profile.phone || "",
    location: profile.location || "",
    
    // Work Information
    position: profile.position || "",
    department: "",
    industry: profile.industry || "",
    experience: profile.experience?.[0]?.description || "",
    
    // Social Profiles
    linkedin: profile.linkedinUrl || "",
    twitter: "",
    facebook: "",
    website: "",
    
    // Location Information
    city,
    state,
    country: "",
    
    // Company Information
    companyName: profile.company || "",
    companyDomain: "",
    companyWebsite: "",
    companyIndustry: profile.industry || "",
    companySize: "",
    companyRevenue: "",
    companyFoundedYear: "",
    companyPhone: "",
    companyLinkedin: "",
    
    // Additional fields
    status: "new",
    source: "linkedin_enrichment",
    notes: profile.summary || "",
  };
}
