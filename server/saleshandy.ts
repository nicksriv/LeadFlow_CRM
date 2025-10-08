import type { Lead } from "@shared/schema";

interface SaleshandyProspect {
  _id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  company?: string;
  title?: string;
  phone?: string;
  city?: string;
  state?: string;
  country?: string;
  linkedinUrl?: string;
  website?: string;
  companyWebsite?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
  status?: string;
  // Additional custom fields
  [key: string]: any;
}

interface SaleshandyProspectsResponse extends Array<SaleshandyProspect> {}

export interface SaleshandyImportResult {
  prospects: SaleshandyProspect[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Fetch prospects from Saleshandy
 * Uses GET /api/v1/prospects endpoint
 */
export async function fetchSaleshandyProspects(
  page: number = 1,
  limit: number = 100
): Promise<SaleshandyImportResult> {
  const apiKey = process.env.SALESHANDY_API_KEY;
  
  if (!apiKey) {
    throw new Error("Saleshandy API key not configured");
  }

  const url = new URL("https://open-api.saleshandy.com/v1/prospects");
  // Note: The /v1/prospects endpoint does not support status filtering
  // and does not include sequence status in the response
  // Try without pagination parameters to see what API returns
  // url.searchParams.append("page", page.toString());
  // url.searchParams.append("limit", limit.toString());

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "x-api-key": apiKey,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Saleshandy API Error Details:", {
      status: response.status,
      statusText: response.statusText,
      errorBody: errorText,
      url: url.toString()
    });
    throw new Error(`Saleshandy API error: ${response.status} - ${errorText}`);
  }

  const rawData = await response.json();
  
  // Check if it's an array or object with data property
  let allProspects: SaleshandyProspect[] = [];
  
  if (Array.isArray(rawData)) {
    allProspects = rawData;
  } else if (rawData.payload && Array.isArray(rawData.payload)) {
    allProspects = rawData.payload;
  } else if (rawData.data && Array.isArray(rawData.data)) {
    allProspects = rawData.data;
  } else if (rawData.prospects && Array.isArray(rawData.prospects)) {
    allProspects = rawData.prospects;
  }

  console.log("Total prospects from API (status=Replied filter):", allProspects.length);

  return {
    prospects: allProspects,
    pagination: {
      total: allProspects.length,
      page: 1,
      limit: allProspects.length,
      totalPages: 1,
    },
  };
}

/**
 * Map Saleshandy prospect to Lead schema
 * Saleshandy uses an attributes array with key-value pairs
 */
export function mapSaleshandyProspectToLead(prospect: SaleshandyProspect): Partial<Lead> {
  const leadData: Partial<Lead> = {};

  // Helper function to get attribute value by key
  const getAttr = (key: string): string | undefined => {
    const attr = prospect.attributes?.find((a: any) => a.key === key);
    return attr?.value || undefined;
  };

  // Email (required)
  leadData.email = prospect.email || getAttr("Email");

  // Personal information
  const firstName = getAttr("First Name");
  const lastName = getAttr("Last Name");
  
  if (firstName) leadData.firstName = firstName;
  if (lastName) leadData.lastName = lastName;
  
  if (firstName && lastName) {
    leadData.name = `${firstName} ${lastName}`;
  } else if (firstName) {
    leadData.name = firstName;
  }

  // Work information
  const jobTitle = getAttr("Job Title");
  const company = getAttr("Company");
  
  if (jobTitle) leadData.position = jobTitle;
  if (company) leadData.company = company;

  // Contact information
  const phone = getAttr("Phone Number");
  if (phone) leadData.phone = phone;

  // Location
  const city = getAttr("City");
  const state = getAttr("State");
  const country = getAttr("Country");
  
  if (city) leadData.city = city;
  if (state) leadData.state = state;
  if (country) leadData.country = country;

  // Social & Web
  const linkedin = getAttr("LinkedIn");
  const twitter = getAttr("Twitter");
  const facebook = getAttr("Facebook");
  const website = getAttr("Website");
  const companyWebsite = getAttr("Company Website");
  
  if (linkedin) leadData.linkedinUrl = linkedin;
  if (twitter) leadData.twitterUrl = twitter;
  if (facebook) leadData.facebookUrl = facebook;
  if (website) leadData.website = website;
  if (companyWebsite) leadData.companyWebsite = companyWebsite;

  // Company information
  const companyDomain = getAttr("Company Domain");
  if (companyDomain) leadData.companyDomain = companyDomain;

  // Default status and score
  leadData.status = "new";
  leadData.score = 0;

  return leadData;
}
