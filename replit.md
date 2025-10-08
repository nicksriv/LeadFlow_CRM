# LeadFlow CRM

## Overview
LeadFlow CRM is a comprehensive Customer Relationship Management system designed to streamline sales processes, enhance lead management, and provide intelligent insights. It integrates with Microsoft 365 for email synchronization and leverages OpenAI's GPT-5 for advanced AI-powered lead scoring and conversation analysis. The system aims to optimize the lead-to-deal conversion funnel through automation, predictive analytics, and a user-friendly interface.

## User Preferences
I prefer iterative development with regular updates. Please ensure all changes maintain a professional UX with consistent visual quality. Prioritize architectural decisions and high-level features. I expect clear, concise communication and detailed explanations for complex implementations.

## System Architecture
The application is built with a modern tech stack:
- **Frontend**: React with TypeScript, Wouter for routing, React Query for data fetching, and Tailwind CSS with Shadcn UI for styling. It supports full dark mode and incorporates professional UX elements like skeleton loading components for AI features, vibrant color schemes for data visualization, and a responsive design.
- **Backend**: Express.js with TypeScript, managing API endpoints for leads, users, conversations, tasks, templates, scoring, and automation.
- **Database**: PostgreSQL with Drizzle ORM, featuring 16 core tables including users, leads, conversations, activities, lead scores, email templates, tasks, scoring config, assignment rules, automation rules, pipelines, deals, and sync state.
- **AI**: OpenAI GPT-5 is integrated for lead scoring, conversation summarization, email response drafting, next-best-action recommendations, sentiment analysis timeline, and predictive deal forecasting.
- **Email Integration**: Microsoft 365 integration uses OAuth 2.0 and Microsoft Graph API for email fetching, sending, and real-time webhook-based synchronization.
- **Workflow Automation**: A robust engine handles trigger-based automations (e.g., score changes, new conversations, deal stage changes) to execute actions like converting leads, creating tasks, or advancing deal stages.
- **User Hierarchy**: The system supports a hierarchical user management structure (Admin > Sales Manager > Sales Rep) with role-based access and lead ownership tracking.
- **UI/UX Decisions**: Emphasizes semantic color systems, WCAG contrast compliance, and visual feedback through gradients, icons, and progress indicators.
- **Feature Specifications**: Key capabilities include comprehensive lead and deal management (Kanban board), AI-powered lead scoring and status classification (Cold, Warm, Hot), workflow automation, MS 365 email integration, task management, customizable AI scoring weights, and an analytics dashboard with revenue forecasting.
- **Lead Data Model**: Comprehensive lead data capture across 5 organized categories: Contact Information (firstName, lastName, email, phone, location), Work Information (position, department, industry, experience), Social Profiles (LinkedIn, Twitter, Facebook, website), Location Information (city, state, country), and Company Information (name, domain, website, industry, size, revenue, founded year, phone, LinkedIn). Form uses Accordion component for organized user experience, auto-generates full name from firstName+lastName, and supports custom JSONB fields.

## External Dependencies
- **OpenAI GPT-5**: Used for all AI-powered features, including lead scoring, conversation analysis, summarization, email drafting, and predictive analytics.
- **Microsoft Graph API**: Utilized for Microsoft 365 mailbox integration, including OAuth 2.0 authentication, email synchronization (fetching and sending), and real-time webhook notifications.
- **Apollo.io API**: Integrated for lead enrichment with contact data, company information, and social profiles. Requires paid API plan for full access to the `/v1/people/match` endpoint. Enrichment data is tracked in the `enrichmentHistory` table.
- **Saleshandy API**: Integrated for adding leads to email sequences for cold email campaigns. Leads can be added to sequences via the `/v1/prospects` endpoint with sequence step IDs. Campaign prospect data is tracked in the `campaignProspects` table.
- **PostgreSQL**: The primary relational database for all application data storage.

## Recent Updates (October 8, 2025)

### Apollo.io Integration
- **Backend Implementation**: `server/apollo.ts` handles lead enrichment via Apollo.io's Person Enrichment API
- **API Endpoint**: POST `/api/leads/:id/enrich-apollo` triggers enrichment for a specific lead
- **Data Enrichment**: Automatically enriches firstName, lastName, position, LinkedIn/Twitter/Facebook URLs, location (city, state, country), phone, and company information
- **Tracking**: All enrichment attempts are logged in the `enrichmentHistory` table with status, enriched fields, credits used, and error messages
- **UI Integration**: Lead detail page includes "Enrich with Apollo" button with loading states and success/error toasts
- **Error Handling**: Gracefully handles API errors, missing data, and API plan limitations

### Saleshandy Integration
- **Backend Implementation**: `server/saleshandy.ts` handles adding leads to email sequences
- **API Endpoint**: POST `/api/leads/:id/add-to-sequence` with `sequenceStepId` parameter
- **Data Mapping**: Automatically maps lead fields (email, firstName, lastName, company, position, phone, location, social profiles) to Saleshandy prospect fields
- **Tracking**: All sequence additions are logged in the `campaignProspects` table with sequence step ID, prospect ID, status, and timestamps
- **UI Integration**: Lead detail page includes "Add to Sequence" button that opens a dialog for manual sequence step ID entry
- **Error Handling**: Validates email presence, handles API errors, and provides clear error messages to users

### Database Schema Extensions
- **enrichmentHistory Table**: Tracks all Apollo enrichment attempts with JSONB enrichment data, array of enriched fields, credits used, status, and error messages
- **campaignProspects Table**: Tracks Saleshandy sequence assignments with sequence step ID, Saleshandy prospect ID, status, and timestamps

### Integration Notes
- API keys are stored in Replit Secrets (APOLLO_API_KEY, SALESHANDY_API_KEY)
- Apollo.io free plan has limitations on API endpoint access - paid plan required for full functionality
- Saleshandy requires valid sequence step IDs which must be obtained from the Saleshandy dashboard
- Both integrations include comprehensive error handling and user feedback via toasts
- Database tracking tables enable audit trails and integration history