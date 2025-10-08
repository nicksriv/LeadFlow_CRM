import type { Lead } from "@shared/schema";

interface SaleshandyField {
  id: string;
  value: string;
}

interface SaleshandyProspect {
  fields: SaleshandyField[];
}

interface AddProspectRequest {
  prospectList: SaleshandyProspect[];
  stepId: string;
  verifyProspects?: boolean;
  conflictAction?: "overwrite" | "addMissingFields";
}

interface SaleshandySequenceResponse {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Add a lead to a Saleshandy email sequence
 */
export async function addLeadToSaleshandySequence(
  lead: Lead,
  sequenceStepId: string,
  options: {
    verifyProspects?: boolean;
    conflictAction?: "overwrite" | "addMissingFields";
  } = {}
): Promise<SaleshandySequenceResponse> {
  const apiKey = process.env.SALESHANDY_API_KEY;
  
  if (!apiKey) {
    throw new Error("Saleshandy API key not configured");
  }

  // Build prospect fields
  const fields: SaleshandyField[] = [];

  // Email is required
  if (lead.email) {
    fields.push({ id: "email", value: lead.email });
  } else {
    throw new Error("Lead must have an email to add to Saleshandy sequence");
  }

  // Add optional fields
  if (lead.firstName) {
    fields.push({ id: "firstName", value: lead.firstName });
  }
  
  if (lead.lastName) {
    fields.push({ id: "lastName", value: lead.lastName });
  }
  
  if (lead.name) {
    fields.push({ id: "fullName", value: lead.name });
  }
  
  if (lead.company) {
    fields.push({ id: "company", value: lead.company });
  }
  
  if (lead.position) {
    fields.push({ id: "title", value: lead.position });
  }
  
  if (lead.phone) {
    fields.push({ id: "phone", value: lead.phone });
  }
  
  if (lead.city) {
    fields.push({ id: "city", value: lead.city });
  }
  
  if (lead.state) {
    fields.push({ id: "state", value: lead.state });
  }
  
  if (lead.country) {
    fields.push({ id: "country", value: lead.country });
  }
  
  if (lead.linkedinUrl) {
    fields.push({ id: "linkedinUrl", value: lead.linkedinUrl });
  }
  
  if (lead.website) {
    fields.push({ id: "website", value: lead.website });
  }

  if (lead.companyWebsite) {
    fields.push({ id: "companyWebsite", value: lead.companyWebsite });
  }

  const requestBody: AddProspectRequest = {
    prospectList: [{ fields }],
    stepId: sequenceStepId,
    verifyProspects: options.verifyProspects ?? false,
    conflictAction: options.conflictAction ?? "addMissingFields",
  };

  const response = await fetch("https://open-api.saleshandy.com/v1/prospects", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Saleshandy API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  
  return {
    success: true,
    data: result,
  };
}

/**
 * Add multiple leads to a Saleshandy sequence
 */
export async function bulkAddLeadsToSaleshandySequence(
  leads: Lead[],
  sequenceStepId: string,
  options: {
    verifyProspects?: boolean;
    conflictAction?: "overwrite" | "addMissingFields";
  } = {}
): Promise<SaleshandySequenceResponse> {
  const apiKey = process.env.SALESHANDY_API_KEY;
  
  if (!apiKey) {
    throw new Error("Saleshandy API key not configured");
  }

  const prospectList: SaleshandyProspect[] = leads
    .filter(lead => lead.email) // Only include leads with email
    .map(lead => {
      const fields: SaleshandyField[] = [
        { id: "email", value: lead.email },
      ];

      if (lead.firstName) fields.push({ id: "firstName", value: lead.firstName });
      if (lead.lastName) fields.push({ id: "lastName", value: lead.lastName });
      if (lead.name) fields.push({ id: "fullName", value: lead.name });
      if (lead.company) fields.push({ id: "company", value: lead.company });
      if (lead.position) fields.push({ id: "title", value: lead.position });
      if (lead.phone) fields.push({ id: "phone", value: lead.phone });
      if (lead.city) fields.push({ id: "city", value: lead.city });
      if (lead.state) fields.push({ id: "state", value: lead.state });
      if (lead.country) fields.push({ id: "country", value: lead.country });
      if (lead.linkedinUrl) fields.push({ id: "linkedinUrl", value: lead.linkedinUrl });
      if (lead.website) fields.push({ id: "website", value: lead.website });
      if (lead.companyWebsite) fields.push({ id: "companyWebsite", value: lead.companyWebsite });

      return { fields };
    });

  if (prospectList.length === 0) {
    throw new Error("No leads with email addresses to add to sequence");
  }

  const requestBody: AddProspectRequest = {
    prospectList,
    stepId: sequenceStepId,
    verifyProspects: options.verifyProspects ?? false,
    conflictAction: options.conflictAction ?? "addMissingFields",
  };

  const response = await fetch("https://open-api.saleshandy.com/v1/prospects", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Saleshandy API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  
  return {
    success: true,
    data: result,
  };
}

/**
 * Get analytics/tracking data for a prospect (future feature - requires webhook setup)
 */
export async function getSaleshandyProspectAnalytics(prospectEmail: string): Promise<any> {
  // Note: Saleshandy doesn't currently provide a direct API endpoint to fetch prospect analytics
  // This would require webhook integration to receive real-time engagement data
  // For now, we track this data in our database when webhooks are configured
  
  throw new Error("Saleshandy prospect analytics require webhook configuration");
}
