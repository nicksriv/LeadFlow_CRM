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
- **Apollo.io API**: Integrated for importing leads from Apollo.io's database (210M+ contacts). Uses POST `/api/v1/mixed_people/search` endpoint to search and import contacts. Requires paid API plan for full access. Import data is tracked in the `enrichmentHistory` table.
- **Saleshandy API**: Integrated for importing prospects from Saleshandy email sequences. Uses GET `/api/v1/prospects` endpoint to fetch and import prospects. Import data is tracked in the `campaignProspects` table.
- **PostgreSQL**: The primary relational database for all application data storage.

## Recent Updates (October 8, 2025)

### Apollo.io Integration (Pull-Based Import)
- **Backend Implementation**: `server/apollo.ts` implements pull-based import from Apollo.io's contact database
- **Search Endpoint**: POST `/api/integrations/apollo/search` - searches Apollo database with filters (job titles, locations, company names, seniority)
- **Import Endpoint**: POST `/api/integrations/apollo/import` - imports selected contacts from search results
- **Search Filters**: Supports filtering by person titles, person locations, person seniorities, organization names, organization locations, industry tags, and employee count ranges
- **Pagination**: Handles up to 100 contacts per page
- **Data Mapping**: Maps Apollo contact data to Lead schema (personal info, work info, social profiles, location, company info)
- **Duplicate Detection**: Checks for existing leads by email before importing to prevent duplicates
- **Tracking**: All imports are logged in the `enrichmentHistory` table with import data, imported fields, and status
- **UI Integration**: Leads page includes "Import Leads" button that opens a dialog with Apollo tab for searching and importing
- **Error Handling**: Gracefully handles API errors, missing data, and API plan limitations

### Saleshandy Integration (Pull-Based Import)
- **Backend Implementation**: `server/saleshandy.ts` implements pull-based import from Saleshandy prospects
- **Fetch Endpoint**: GET `/api/integrations/saleshandy/prospects` - fetches prospects from Saleshandy with pagination
- **Import Endpoint**: POST `/api/integrations/saleshandy/import` - imports selected prospects
- **Pagination**: Supports pagination with configurable page size (default 50 prospects per page)
- **Data Mapping**: Maps Saleshandy prospect fields to Lead schema (email, name, position, company, phone, location, social profiles)
- **Duplicate Detection**: Checks for existing leads by email before importing to prevent duplicates
- **Tracking**: All imports are logged in the `campaignProspects` table with import data and status
- **UI Integration**: Leads page includes "Import Leads" button with Saleshandy tab for viewing and importing prospects
- **Error Handling**: Validates email presence, handles API errors, and provides clear error messages to users

### Import UI Features
- **Dual-Tab Dialog**: Import dialog with tabs for Apollo.io and Saleshandy imports
- **Apollo Tab**: Search filters for job titles, locations, and company names; displays search results with checkbox selection; "Select All" functionality; shows import results (imported, skipped, errors)
- **Saleshandy Tab**: Auto-fetches prospects on load; displays prospects with checkbox selection; pagination controls; shows import results
- **Import Results**: Visual feedback showing imported count, skipped count (duplicates/missing email), and error count
- **Loading States**: Proper loading indicators during search, fetch, and import operations
- **Toast Notifications**: Success and error toasts for all operations

### Database Schema Usage
- **enrichmentHistory Table**: Repurposed to track Apollo import attempts with JSONB import data, array of imported fields, credits used, status, and error messages
- **campaignProspects Table**: Repurposed to track Saleshandy imports with prospect ID, import data, status, and timestamps

### LinkedIn Screenshot OCR (Latest)
- **Backend Implementation**: `server/linkedin-ocr.ts` implements LinkedIn profile data extraction from screenshots using OpenAI Vision API
- **OCR Endpoint**: POST `/api/integrations/linkedin/screenshot` - accepts base64 encoded screenshot image
- **Technology**: OpenAI GPT-4 Vision (gpt-4o) analyzes screenshots and extracts structured data
- **Data Extraction**: Extracts personal info (name, email, phone), work info (position, company, industry), location (city, state, country), summary/about text, and LinkedIn URL
- **Auto-fill**: Extracted data automatically populates lead form fields (firstName, lastName, email, phone, position, company, location, notes, etc.)
- **UI Integration**: Lead form includes LinkedIn screenshot upload section in "Social Profiles" accordion with file picker
- **Legal Compliance**: Avoids scraping LinkedIn directly; users capture their own screenshots legally
- **Cost-Effective**: Uses existing OpenAI integration, no additional third-party API costs
- **User Flow**: Upload screenshot → AI extracts data → Form auto-fills → User reviews/submits

### Integration Notes
- API keys are stored in Replit Secrets (APOLLO_API_KEY, SALESHANDY_API_KEY, OPENAI_API_KEY)
- Apollo.io requires paid plan for `/api/v1/mixed_people/search` endpoint access
- Saleshandy endpoint: `https://open-api.saleshandy.com/api/v1/prospects`
- LinkedIn OCR uses OpenAI Vision API (gpt-4o model) for screenshot analysis
- All integrations include comprehensive error handling and user feedback via toasts
- Database tracking tables enable audit trails and import history
- Duplicate detection prevents importing leads that already exist in the CRM (matched by email)