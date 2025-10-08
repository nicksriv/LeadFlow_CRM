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

interface SaleshandyProspectsResponse {
  data: {
    prospects: SaleshandyProspect[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}

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

  const data: SaleshandyProspectsResponse = await response.json();
  
  console.log("Saleshandy API Response:", JSON.stringify(data, null, 2));

  return {
    prospects: data.data.prospects || [],
    pagination: data.data.pagination,
  };
}

/**
 * Map Saleshandy prospect to Lead schema
 */
export function mapSaleshandyProspectToLead(prospect: SaleshandyProspect): Partial<Lead> {
  const leadData: Partial<Lead> = {};

  // Email (required)
  if (prospect.email) {
    leadData.email = prospect.email;
  }

  // Personal information
  if (prospect.firstName) {
    leadData.firstName = prospect.firstName;
  }
  
  if (prospect.lastName) {
    leadData.lastName = prospect.lastName;
  }
  
  if (prospect.fullName) {
    leadData.name = prospect.fullName;
  } else if (prospect.firstName && prospect.lastName) {
    leadData.name = `${prospect.firstName} ${prospect.lastName}`;
  }

  // Work information
  if (prospect.title) {
    leadData.position = prospect.title;
  }
  
  if (prospect.company) {
    leadData.company = prospect.company;
  }

  // Contact information
  if (prospect.phone) {
    leadData.phone = prospect.phone;
  }

  // Location
  if (prospect.city) {
    leadData.city = prospect.city;
  }
  
  if (prospect.state) {
    leadData.state = prospect.state;
  }
  
  if (prospect.country) {
    leadData.country = prospect.country;
  }

  // Social & Web
  if (prospect.linkedinUrl) {
    leadData.linkedinUrl = prospect.linkedinUrl;
  }
  
  if (prospect.website) {
    leadData.website = prospect.website;
  }
  
  if (prospect.companyWebsite) {
    leadData.companyWebsite = prospect.companyWebsite;
  }

  // Default status and score
  leadData.status = "new";
  leadData.score = 0;

  return leadData;
}
