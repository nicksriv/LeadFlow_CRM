/**
 * Microsoft 365 / Graph API Integration
 * 
 * This module handles OAuth authentication and email syncing with MS 365.
 * 
 * Setup Requirements:
 * 1. Register app in Azure AD (https://portal.azure.com)
 * 2. Add Microsoft Graph API permissions: Mail.Read, Mail.ReadWrite
 * 3. Configure OAuth 2.0 redirect URI
 * 4. Set environment variables:
 *    - MS365_CLIENT_ID
 *    - MS365_CLIENT_SECRET
 *    - MS365_TENANT_ID
 */

import { storage } from "./storage";

interface MS365Config {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  redirectUri: string;
}

interface EmailMessage {
  id: string;
  subject: string;
  body: string;
  from: string;
  to: string;
  sentDateTime: string;
  isRead: boolean;
}

export class MS365Integration {
  private config: MS365Config;

  constructor() {
    this.config = {
      clientId: process.env.MS365_CLIENT_ID || "",
      clientSecret: process.env.MS365_CLIENT_SECRET || "",
      tenantId: process.env.MS365_TENANT_ID || "",
      redirectUri: process.env.MS365_REDIRECT_URI || "http://localhost:5000/auth/callback",
    };
  }

  /**
   * Get OAuth authorization URL for user to grant permissions
   */
  getAuthorizationUrl(): string {
    const baseUrl = `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/authorize`;
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: "code",
      redirect_uri: this.config.redirectUri,
      response_mode: "query",
      scope: "https://graph.microsoft.com/Mail.Read offline_access",
    });
    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   * 
   * In production, this would:
   * 1. POST to https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token
   * 2. Store access_token and refresh_token in database
   * 3. Return tokens for subsequent API calls
   */
  async exchangeCodeForToken(authCode: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    const tokenUrl = `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/token`;
    
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      code: authCode,
      redirect_uri: this.config.redirectUri,
      grant_type: "authorization_code",
      scope: "https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Mail.ReadWrite offline_access",
    });

    try {
      const response = await fetch(tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Token exchange failed: ${error}`);
      }

      const data = await response.json();
      
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
      };
    } catch (error) {
      console.error("MS365: Token exchange failed:", error);
      throw error;
    }
  }

  /**
   * Refresh expired access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<string> {
    const tokenUrl = `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/token`;
    
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
      scope: "https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Mail.ReadWrite offline_access",
    });

    try {
      const response = await fetch(tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Token refresh failed: ${error}`);
      }

      const data = await response.json();
      return data.access_token;
    } catch (error) {
      console.error("MS365: Token refresh failed:", error);
      throw error;
    }
  }

  /**
   * Fetch emails from MS 365 mailbox
   * 
   * Uses Microsoft Graph API: GET /me/messages
   * Supports delta queries for incremental sync
   */
  async fetchEmails(
    accessToken: string,
    deltaToken?: string
  ): Promise<{
    emails: EmailMessage[];
    nextDeltaToken: string;
  }> {
    const baseUrl = deltaToken || "https://graph.microsoft.com/v1.0/me/messages/delta";
    const url = deltaToken ? deltaToken : `${baseUrl}?$top=50&$select=id,subject,body,from,toRecipients,sentDateTime,isRead`;

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to fetch emails: ${error}`);
      }

      const data = await response.json();
      const emails: EmailMessage[] = data.value.map((msg: any) => ({
        id: msg.id,
        subject: msg.subject || "(No Subject)",
        body: msg.body?.content || "",
        from: msg.from?.emailAddress?.address || "",
        to: msg.toRecipients?.[0]?.emailAddress?.address || "",
        sentDateTime: msg.sentDateTime,
        isRead: msg.isRead,
      }));

      // Extract delta link for next sync
      const nextDeltaToken = data["@odata.deltaLink"] || data["@odata.nextLink"] || deltaToken || "";

      return {
        emails,
        nextDeltaToken,
      };
    } catch (error) {
      console.error("MS365: Failed to fetch emails:", error);
      throw error;
    }
  }

  /**
   * Sync emails and match with leads
   * 
   * This is the main sync function that:
   * 1. Fetches new emails from MS 365
   * 2. Matches sender email addresses with leads in database
   * 3. Creates conversation records for matched emails
   * 4. Triggers AI scoring for updated leads
   */
  async syncEmailsWithLeads(): Promise<{
    synced: number;
    matched: number;
    unmatched: number;
  }> {
    console.log("MS365: Starting email sync with leads...");

    try {
      const syncState = await storage.getSyncState();
      if (!syncState || syncState.isConfigured !== 1) {
        throw new Error("MS 365 not configured");
      }

      // In production:
      // 1. Get access token (refresh if expired)
      // 2. Fetch emails using delta token for incremental sync
      // 3. For each email, find matching lead by email address
      // 4. Create conversation record
      // 5. Update last sync time and delta token

      const accessToken = syncState.accessToken || "";
      const deltaToken = syncState.deltaToken || undefined;

      const { emails, nextDeltaToken } = await this.fetchEmails(
        accessToken,
        deltaToken
      );

      let matched = 0;
      let unmatched = 0;

      for (const email of emails) {
        const leads = await storage.getLeads();
        const matchedLead = leads.find((l) => 
          l.email.toLowerCase() === email.from.toLowerCase()
        );

        if (matchedLead) {
          // Create conversation record
          await storage.createConversation({
            leadId: matchedLead.id,
            subject: email.subject,
            body: email.body,
            fromEmail: email.from,
            toEmail: email.to,
            sentAt: new Date(email.sentDateTime),
            isFromLead: 1,
            messageId: email.id,
          });
          matched++;
        } else {
          unmatched++;
        }
      }

      // Update sync state
      await storage.updateSyncState({
        lastSyncAt: new Date(),
        deltaToken: nextDeltaToken,
      });

      console.log(`MS365: Sync complete - ${matched} matched, ${unmatched} unmatched`);

      return {
        synced: emails.length,
        matched,
        unmatched,
      };
    } catch (error) {
      console.error("MS365: Sync failed:", error);
      throw error;
    }
  }

  /**
   * Setup webhook for real-time email notifications
   * 
   * Uses Microsoft Graph subscriptions API to receive notifications
   * when new emails arrive, instead of polling
   */
  async setupWebhook(callbackUrl: string, accessToken: string): Promise<{ subscriptionId: string }> {
    const url = "https://graph.microsoft.com/v1.0/subscriptions";
    
    // Subscriptions expire after max 3 days for user mailbox resources
    const expirationDateTime = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    
    const payload = {
      changeType: "created",
      notificationUrl: callbackUrl,
      resource: "/me/messages",
      expirationDateTime,
      clientState: process.env.MS365_WEBHOOK_SECRET || "webhook_secret_" + Date.now(),
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to setup webhook: ${error}`);
      }

      const data = await response.json();
      
      console.log(`MS365: Webhook subscription created: ${data.id}, expires: ${expirationDateTime}`);
      
      return {
        subscriptionId: data.id,
      };
    } catch (error) {
      console.error("MS365: Failed to setup webhook:", error);
      throw error;
    }
  }

  /**
   * Send email via MS 365 Graph API
   * 
   * Uses Microsoft Graph API: POST /me/sendMail
   */
  async sendEmail(params: {
    to: string;
    subject: string;
    body: string;
    accessToken: string;
  }): Promise<{ success: boolean; messageId?: string }> {
    const url = "https://graph.microsoft.com/v1.0/me/sendMail";
    
    const payload = {
      message: {
        subject: params.subject,
        body: {
          contentType: "HTML",
          content: params.body,
        },
        toRecipients: [
          {
            emailAddress: {
              address: params.to,
            },
          },
        ],
      },
      saveToSentItems: true,
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${params.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to send email: ${error}`);
      }

      return {
        success: true,
        messageId: `sent_${Date.now()}`,
      };
    } catch (error) {
      console.error("MS365: Failed to send email:", error);
      throw error;
    }
  }

  /**
   * Handle webhook notification from MS 365
   */
  async handleWebhookNotification(notification: any, accessToken: string): Promise<void> {
    console.log("MS365: Received webhook notification", notification);
    
    // Validate clientState matches what we sent
    const expectedClientState = process.env.MS365_WEBHOOK_SECRET;
    if (notification.clientState && notification.clientState !== expectedClientState) {
      console.warn("MS365: Invalid clientState in webhook notification");
      return;
    }

    // Extract resource data from notification
    const resourceData = notification.resourceData;
    if (!resourceData || !resourceData.id) {
      console.warn("MS365: No resource data in notification");
      return;
    }

    const messageId = resourceData.id;

    try {
      // Fetch full message details from Graph API
      const messageUrl = `https://graph.microsoft.com/v1.0/me/messages/${messageId}`;
      const response = await fetch(messageUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch message details");
      }

      const message = await response.json();
      
      // Extract email data
      const fromEmail = message.from?.emailAddress?.address;
      if (!fromEmail) return;

      // Match with lead
      const leads = await storage.getLeads();
      const matchedLead = leads.find((l) => 
        l.email.toLowerCase() === fromEmail.toLowerCase()
      );

      if (matchedLead) {
        // Create conversation record
        await storage.createConversation({
          leadId: matchedLead.id,
          subject: message.subject || "(No Subject)",
          body: message.body?.content || "",
          fromEmail,
          toEmail: message.toRecipients?.[0]?.emailAddress?.address || "",
          sentAt: new Date(message.sentDateTime),
          isFromLead: 1,
          messageId: message.id,
        });

        console.log(`MS365: Created conversation for lead ${matchedLead.id} from webhook`);
        
        // TODO: Trigger AI scoring in background
      }
    } catch (error) {
      console.error("MS365: Failed to handle webhook notification:", error);
    }
  }
}

export const ms365Integration = new MS365Integration();
