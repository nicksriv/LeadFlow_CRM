import type { Lead } from "@shared/schema";

interface ApolloSearchFilters {
  // Person filters
  personTitles?: string[];
  personSeniorities?: string[];
  personLocations?: string[];
  
  // Organization filters
  organizationNames?: string[];
  organizationLocations?: string[];
  organizationIndustryTagIds?: string[];
  organizationNumEmployeesRanges?: string[];
  
  // Pagination
  page?: number;
  perPage?: number;
}

interface ApolloPerson {
  id: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  email?: string;
  headline?: string;
  title?: string;
  seniority?: string;
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

interface ApolloSearchResponse {
  people: ApolloPerson[];
  pagination: {
    page: number;
    per_page: number;
    total_entries: number;
    total_pages: number;
  };
}

export interface ApolloImportResult {
  contacts: ApolloPerson[];
  pagination: {
    page: number;
    perPage: number;
    totalEntries: number;
    totalPages: number;
  };
}

/**
 * Search Apollo.io database for contacts using advanced filters
 * Uses POST /api/v1/mixed_people/search endpoint
 */
export async function searchApolloContacts(filters: ApolloSearchFilters): Promise<ApolloImportResult> {
  const apiKey = process.env.APOLLO_API_KEY;
  
  if (!apiKey) {
    throw new Error("Apollo API key not configured");
  }

  // Build the search request payload
  const payload: any = {
    page: filters.page || 1,
    per_page: filters.perPage || 100, // Max 100 per page
  };

  // Add person filters
  if (filters.personTitles && filters.personTitles.length > 0) {
    payload.person_titles = filters.personTitles;
  }

  if (filters.personSeniorities && filters.personSeniorities.length > 0) {
    payload.person_seniorities = filters.personSeniorities;
  }

  if (filters.personLocations && filters.personLocations.length > 0) {
    payload.person_locations = filters.personLocations;
  }

  // Add organization filters
  if (filters.organizationNames && filters.organizationNames.length > 0) {
    payload.organization_names = filters.organizationNames;
  }

  if (filters.organizationLocations && filters.organizationLocations.length > 0) {
    payload.organization_locations = filters.organizationLocations;
  }

  if (filters.organizationIndustryTagIds && filters.organizationIndustryTagIds.length > 0) {
    payload.organization_industry_tag_ids = filters.organizationIndustryTagIds;
  }

  if (filters.organizationNumEmployeesRanges && filters.organizationNumEmployeesRanges.length > 0) {
    payload.organization_num_employees_ranges = filters.organizationNumEmployeesRanges;
  }

  // Make the API request
  const response = await fetch("https://api.apollo.io/api/v1/mixed_people/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Apollo API error: ${response.status} - ${errorText}`);
  }

  const apolloData: ApolloSearchResponse = await response.json();

  return {
    contacts: apolloData.people || [],
    pagination: {
      page: apolloData.pagination.page,
      perPage: apolloData.pagination.per_page,
      totalEntries: apolloData.pagination.total_entries,
      totalPages: apolloData.pagination.total_pages,
    },
  };
}

/**
 * Map Apollo contact to Lead schema
 */
export function mapApolloContactToLead(apolloContact: ApolloPerson): Partial<Lead> {
  const leadData: Partial<Lead> = {};

  // Personal information
  if (apolloContact.first_name) {
    leadData.firstName = apolloContact.first_name;
  }
  
  if (apolloContact.last_name) {
    leadData.lastName = apolloContact.last_name;
  }
  
  if (apolloContact.name) {
    leadData.name = apolloContact.name;
  } else if (apolloContact.first_name && apolloContact.last_name) {
    leadData.name = `${apolloContact.first_name} ${apolloContact.last_name}`;
  }
  
  if (apolloContact.email) {
    leadData.email = apolloContact.email;
  }

  // Work information
  if (apolloContact.title) {
    leadData.position = apolloContact.title;
  }

  // Social profiles  
  if (apolloContact.linkedin_url) {
    leadData.linkedinUrl = apolloContact.linkedin_url;
  }
  
  if (apolloContact.twitter_url) {
    leadData.twitterUrl = apolloContact.twitter_url;
  }
  
  if (apolloContact.facebook_url) {
    leadData.facebookUrl = apolloContact.facebook_url;
  }

  // Location
  if (apolloContact.city) {
    leadData.city = apolloContact.city;
  }
  
  if (apolloContact.state) {
    leadData.state = apolloContact.state;
  }
  
  if (apolloContact.country) {
    leadData.country = apolloContact.country;
  }

  // Phone number
  if (apolloContact.phone_numbers && apolloContact.phone_numbers.length > 0) {
    const primaryPhone = apolloContact.phone_numbers.find(p => p.type === 'work') || apolloContact.phone_numbers[0];
    leadData.phone = primaryPhone.number;
  }

  // Company information
  const org = apolloContact.organization;
  
  if (org) {
    if (org.name) {
      leadData.company = org.name;
    }
    
    if (org.website_url) {
      leadData.companyWebsite = org.website_url;
    }
    
    if (org.domain) {
      leadData.companyDomain = org.domain;
    }
    
    if (org.linkedin_url) {
      leadData.companyLinkedin = org.linkedin_url;
    }
    
    if (org.industry) {
      leadData.companyIndustry = org.industry;
    }
    
    if (org.num_employees_enum) {
      leadData.companySize = org.num_employees_enum;
    }
    
    if (org.founded_year) {
      leadData.companyFoundedYear = org.founded_year;
    }
    
    if (org.primary_phone?.number) {
      leadData.companyPhone = org.primary_phone.number;
    }
  }

  // Default status and score
  leadData.status = "new";
  leadData.score = 0;

  return leadData;
}
