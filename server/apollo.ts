import type { Lead } from "@shared/schema";

interface ApolloPersonMatch {
  id: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  email?: string;
  headline?: string;
  title?: string;
  organization_name?: string;
  linkedin_url?: string;
  twitter_url?: string;
  facebook_url?: string;
  city?: string;
  state?: string;
  country?: string;
  phone_numbers?: Array<{
    number: string;
    type?: string;
  }>;
  organization?: {
    id?: string;
    name?: string;
    website_url?: string;
    domain?: string;
    linkedin_url?: string;
    industry?: string;
    num_employees_enum?: string;
    estimated_num_employees?: number;
    retail_location_count?: number;
    founded_year?: number;
    primary_phone?: {
      number?: string;
    };
  };
}

interface ApolloEnrichmentResponse {
  person?: ApolloPersonMatch;
  organization?: {
    name?: string;
    website_url?: string;
    domain?: string;
    linkedin_url?: string;
    industry?: string;
    num_employees_enum?: string;
    estimated_num_employees?: number;
    founded_year?: number;
    primary_phone?: {
      number?: string;
    };
  };
}

export interface EnrichmentResult {
  enrichedFields: string[];
  data: Partial<Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>>;
  apolloResponse: any;
}

/**
 * Enrich a lead using Apollo.io People Enrichment API
 */
export async function enrichLeadWithApollo(lead: Lead): Promise<EnrichmentResult> {
  const apiKey = process.env.APOLLO_API_KEY;
  
  if (!apiKey) {
    throw new Error("Apollo API key not configured");
  }

  // Build the match request based on available lead data
  const matchParams: any = {};
  
  if (lead.email) {
    matchParams.email = lead.email;
  }
  
  if (lead.firstName && lead.lastName) {
    matchParams.first_name = lead.firstName;
    matchParams.last_name = lead.lastName;
  } else if (lead.name) {
    const nameParts = lead.name.split(" ");
    if (nameParts.length >= 2) {
      matchParams.first_name = nameParts[0];
      matchParams.last_name = nameParts.slice(1).join(" ");
    }
  }
  
  if (lead.company) {
    matchParams.organization_name = lead.company;
  }
  
  if (lead.companyDomain) {
    matchParams.domain = lead.companyDomain;
  }

  if (lead.linkedinUrl) {
    matchParams.linkedin_url = lead.linkedinUrl;
  }

  // Make the API request
  const response = await fetch("https://api.apollo.io/v1/people/match", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      ...matchParams,
      reveal_personal_emails: true,
      reveal_phone_number: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Apollo API error: ${response.status} - ${errorText}`);
  }

  const apolloData: ApolloEnrichmentResponse = await response.json();
  const person = apolloData.person;
  
  if (!person) {
    throw new Error("No matching person found in Apollo database");
  }

  // Extract enriched data
  const enrichedData: Partial<Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>> = {};
  const enrichedFields: string[] = [];

  // Personal information
  if (person.first_name && !lead.firstName) {
    enrichedData.firstName = person.first_name;
    enrichedFields.push("firstName");
  }
  
  if (person.last_name && !lead.lastName) {
    enrichedData.lastName = person.last_name;
    enrichedFields.push("lastName");
  }
  
  if ((person.email && !lead.email) || (person.email && person.email !== lead.email)) {
    enrichedData.email = person.email;
    enrichedFields.push("email");
  }

  // Work information
  if (person.title && !lead.position) {
    enrichedData.position = person.title;
    enrichedFields.push("position");
  }

  // Social profiles  
  if (person.linkedin_url && !lead.linkedinUrl) {
    enrichedData.linkedinUrl = person.linkedin_url;
    enrichedFields.push("linkedinUrl");
  }
  
  if (person.twitter_url && !lead.twitterUrl) {
    enrichedData.twitterUrl = person.twitter_url;
    enrichedFields.push("twitterUrl");
  }
  
  if (person.facebook_url && !lead.facebookUrl) {
    enrichedData.facebookUrl = person.facebook_url;
    enrichedFields.push("facebookUrl");
  }

  // Location
  if (person.city && !lead.city) {
    enrichedData.city = person.city;
    enrichedFields.push("city");
  }
  
  if (person.state && !lead.state) {
    enrichedData.state = person.state;
    enrichedFields.push("state");
  }
  
  if (person.country && !lead.country) {
    enrichedData.country = person.country;
    enrichedFields.push("country");
  }

  // Phone number
  if (person.phone_numbers && person.phone_numbers.length > 0 && !lead.phone) {
    const primaryPhone = person.phone_numbers.find(p => p.type === 'work') || person.phone_numbers[0];
    enrichedData.phone = primaryPhone.number;
    enrichedFields.push("phone");
  }

  // Company information
  const org = person.organization || apolloData.organization;
  
  if (org) {
    if (org.name && !lead.company) {
      enrichedData.company = org.name;
      enrichedFields.push("company");
    }
    
    if (org.website_url && !lead.companyWebsite) {
      enrichedData.companyWebsite = org.website_url;
      enrichedFields.push("companyWebsite");
    }
    
    if (org.domain && !lead.companyDomain) {
      enrichedData.companyDomain = org.domain;
      enrichedFields.push("companyDomain");
    }
    
    if (org.linkedin_url && !lead.companyLinkedin) {
      enrichedData.companyLinkedin = org.linkedin_url;
      enrichedFields.push("companyLinkedin");
    }
    
    if (org.industry && !lead.companyIndustry) {
      enrichedData.companyIndustry = org.industry;
      enrichedFields.push("companyIndustry");
    }
    
    if (org.num_employees_enum && !lead.companySize) {
      enrichedData.companySize = org.num_employees_enum;
      enrichedFields.push("companySize");
    }
    
    if (org.founded_year && !lead.companyFoundedYear) {
      enrichedData.companyFoundedYear = org.founded_year;
      enrichedFields.push("companyFoundedYear");
    }
    
    if (org.primary_phone?.number && !lead.companyPhone) {
      enrichedData.companyPhone = org.primary_phone.number;
      enrichedFields.push("companyPhone");
    }
  }

  return {
    enrichedFields,
    data: enrichedData,
    apolloResponse: apolloData,
  };
}

/**
 * Bulk enrich multiple leads (up to 10 at a time)
 */
export async function bulkEnrichLeadsWithApollo(leads: Lead[]): Promise<Map<string, EnrichmentResult>> {
  if (leads.length > 10) {
    throw new Error("Apollo bulk enrichment supports maximum 10 leads at once");
  }

  const apiKey = process.env.APOLLO_API_KEY;
  
  if (!apiKey) {
    throw new Error("Apollo API key not configured");
  }

  // Build match requests
  const matchRequests = leads.map(lead => {
    const params: any = {};
    
    if (lead.email) params.email = lead.email;
    if (lead.firstName) params.first_name = lead.firstName;
    if (lead.lastName) params.last_name = lead.lastName;
    if (lead.company) params.organization_name = lead.company;
    if (lead.companyDomain) params.domain = lead.companyDomain;
    if (lead.linkedinUrl) params.linkedin_url = lead.linkedinUrl;
    
    return params;
  });

  const response = await fetch("https://api.apollo.io/v1/people/bulk_match", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      details: matchRequests,
      reveal_personal_emails: true,
      reveal_phone_number: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Apollo bulk API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  const results = new Map<string, EnrichmentResult>();

  // Process each match
  if (result.matches && Array.isArray(result.matches)) {
    result.matches.forEach((match: any, index: number) => {
      if (match && leads[index]) {
        const lead = leads[index];
        const enrichedData: Partial<Lead> = {};
        const enrichedFields: string[] = [];

        // Extract data similar to single enrichment
        if (match.first_name && !lead.firstName) {
          enrichedData.firstName = match.first_name;
          enrichedFields.push("firstName");
        }
        
        if (match.email && !lead.email) {
          enrichedData.email = match.email;
          enrichedFields.push("email");
        }

        // ... (add more field mappings as needed)

        results.set(lead.id, {
          enrichedFields,
          data: enrichedData,
          apolloResponse: match,
        });
      }
    });
  }

  return results;
}
