# LeadFlow CRM

## Overview
A comprehensive CRM system with MS 365 mailbox integration and AI-powered lead scoring. Built with React, Express, PostgreSQL, and OpenAI GPT-5.

## Features
- **Lead Management**: Complete CRUD operations for managing leads with detailed information
- **Pipeline/Deal Management**: Full-featured Kanban board for managing sales pipeline with drag-and-drop
- **Lead-to-Deal Conversion**: One-click conversion of qualified leads to deals with automatic linking
- **Deal Creation**: Create new deals directly from pipeline with comprehensive form validation
- **Revenue Forecasting**: Weighted pipeline value calculations with monthly breakdown and projections
- **AI-Powered Scoring**: Automatic lead scoring (0-100) using OpenAI to analyze email conversations
- **Status Classification**: Intelligent categorization into Cold (0-33), Warm (34-66), and Hot (67-100) leads
- **Workflow Automation**: Trigger-based automation engine for auto-conversion, task creation, and deal progression
- **Email Sending**: Send emails directly from CRM with email template support
- **Email Templates**: Create and manage reusable email templates
- **MS 365 Integration**: Sync email conversations from Microsoft 365 mailbox
- **Conversation Tracking**: View all email threads associated with each lead
- **Task Management**: Create tasks and follow-up reminders for each lead
- **Activity Timeline**: Comprehensive activity log for all lead and deal interactions
- **Advanced Scoring Configuration**: Customizable weighted criteria for AI scoring algorithm
- **Analytics Dashboard**: Insights into lead pipeline performance, conversion metrics, and revenue forecasting
- **Dark Mode**: Full dark mode support throughout the application

## Architecture
- **Frontend**: React with TypeScript, Wouter for routing, React Query for data fetching
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **AI**: OpenAI GPT-5 for conversation analysis and lead scoring
- **Styling**: Tailwind CSS with Shadcn UI components

## Recent Changes
- **October 2024**: MS 365 Integration - Production Implementation
  - Completed full OAuth 2.0 authentication flow with Microsoft Graph API
    - Token exchange endpoint with authorization code grant
    - Automatic token refresh with 5-minute expiry buffer
    - Token persistence in database (accessToken, refreshToken, expiresAt)
  - Email operations via Microsoft Graph API
    - Email fetching with delta queries for incremental sync
    - Email sending with HTML content support
    - Webhook subscriptions for real-time notifications
  - Token lifecycle management
    - ensureValidToken() checks expiry before all Graph API calls
    - Automatic refresh when token expires or within 5 minutes of expiry
    - Updated tokens stored in sync_state table
    - All operations (sync, send, webhook) use token refresh
  - Webhook integration
    - Subscription creation with 3-day expiration
    - Validation token handling for Microsoft verification
    - Real-time email processing with lead matching
    - Automatic conversation creation from webhooks
  - Settings page OAuth flow
    - Connect MS 365 button initiates OAuth redirect
    - Callback handler stores tokens and sets up webhooks
    - Connection status display with last sync timestamp
- **October 2024**: Pipeline/Deal Management Enhancements
  - Lead-to-Deal Conversion
    - Convert to Deal button in lead detail page
    - Pre-filled conversion form with lead context
    - Automatic deal linking via leadId field
    - Redirect to new deal detail page on successful conversion
  - New Deal Creation
    - "New Deal" button in pipeline page
    - Full deal creation dialog with validation
    - Auto-fills current pipeline and first stage
    - Immediate cache refresh for pipeline view
  - Revenue Forecasting
    - Enhanced /api/forecast endpoint with monthly breakdown
    - Weighted revenue calculations (amount × probability)
    - Analytics dashboard integration with 4 new forecast stat cards
    - Monthly revenue visualization with progress bars
    - Shows next 6 months of expected revenue
  - Date Handling Improvements
    - ISO date string coercion in insertDealSchema
    - Proper Date object transformation for API requests
    - Consistent date validation across conversion and creation flows
- **January 2025**: UI/UX Enhancement and Navigation Improvements
  - Visual overhaul with vibrant colors and modern design
    - Colorful stat cards with gradient backgrounds and icon containers
    - Gradient-based lead score meters (hot/warm/cold color schemes)
    - Vibrant role badges (purple/blue/green for admin/manager/rep)
    - Colorful user avatars with distinct color palette
    - Loading skeletons and enhanced empty states
  - Enhanced navigation and layout
    - User profile section in sidebar footer with avatar, role badge, and dropdown menu
    - Breadcrumb navigation in header for better context awareness
    - Quick action button for creating leads from header
    - Responsive design with mobile-optimized breakpoints and padding
    - Touch-friendly controls and proper spacing
  - Hierarchical user management and ownership system
    - Implemented hierarchical user management with Admin > Manager > Sales Rep structure
    - Added Team Management page with organizational hierarchy visualization
    - Lead ownership tracking with ownerId field and assignment capabilities
    - Role-based user filtering and subordinate queries
    - API endpoints for user hierarchy with proper route ordering
    - Owner assignment in lead forms with unassigned state support
    - Seeded test users for demonstration (1 admin, 2 managers, 4 sales reps)
- **October 2024**: Advanced AI Capabilities Implementation
  - AI conversation summarization (GET /api/leads/:id/conversation-summary)
    - Generates concise summaries of email threads with key points and action items
    - Analyzes overall sentiment (positive/neutral/negative)
    - Provides intelligent next-step recommendations
  - AI email response drafting (POST /api/leads/:id/draft-email)
    - Context-aware email composition using GPT-5
    - Multiple response types: follow-up, answer-question, proposal, closing
    - Personalized content based on conversation history with professional tone
    - Input validation for supported response types
  - Next-best-action recommendations (GET /api/leads/:id/next-best-action)
    - Analyzes lead state (score, conversations, activities, tasks)
    - Recommends most impactful next action (send_email, schedule_call, convert_to_deal, etc.)
    - Provides priority level, reasoning, and estimated impact
    - Suggests talking points for recommended actions
  - Sentiment analysis timeline (GET /api/leads/:id/sentiment-timeline)
    - Tracks sentiment evolution across all conversations
    - Numeric scoring (-10 to +10) with classification (positive/neutral/negative)
    - Chronological tracking for relationship progression analysis
    - Brief explanations for each sentiment data point
  - Predictive deal forecasting (GET /api/deals/:id/forecast)
    - Win/loss probability prediction using comprehensive AI analysis
    - Considers deal velocity, conversation sentiment, engagement metrics
    - Provides outcome classification (likely_win/uncertain/likely_loss)
    - Identifies key positive/negative factors and actionable recommendations
    - Confidence levels and estimated close date predictions
  - Robust error handling with graceful fallbacks for all AI features
  - All AI functions integrated in server/ai.ts with GPT-5 model
- **October 2024**: Workflow Automation Engine Implementation
  - Database schema extensions
    - automation_rules table: stores trigger-action configurations with JSONB conditions
    - automation_logs table: tracks execution history with success/error tracking
  - Core automation engine (server/automation.ts)
    - Trigger detection: score_changed, conversation_received, deal_stage_change
    - Action execution: convert_to_deal, create_task, advance_stage, assign_lead, send_email
    - Condition evaluation with flexible JSONB configuration
    - Error handling and execution logging
  - Integration with existing systems
    - Automatic triggers on lead score updates (onLeadScoreChange)
    - Triggers on email conversation received (onConversationReceived)
    - Triggers on deal stage advancement (onDealStageChange)
    - Integrated with AI scoring system for real-time automation
  - API endpoints for automation management
    - Full CRUD operations for automation rules
    - Automation execution logs endpoint
    - Rule activation/deactivation toggle
  - Automation management UI (client/src/pages/automation.tsx)
    - Dashboard with active rules count and execution statistics
    - Visual rule cards with trigger/action badges
    - Rule details dialog with JSON condition viewer
    - Execution logs with success/error tracking
    - Real-time rule activation toggle
  - Default automation rules seeded
    - Auto-convert hot leads (score ≥ 80) to deals
    - Create follow-up task for warm leads (score 34-66)
    - Alert on pricing inquiry keywords
    - Auto-create deal on buying signal detection
    - Re-engagement task for cold leads
- **December 2024**: Added comprehensive new features
  - Email sending capability with template support in lead detail view
  - Email templates management system
  - Task management with priorities, due dates, and status tracking
  - Dedicated Tasks page showing all tasks across leads
  - Advanced Settings page for customizable AI scoring weights
  - Assignment rules and automation infrastructure (schema ready)
  - Enhanced lead detail page with Email Composer and Task dialogs
  - Updated navigation with Tasks and Team menu items
- **November 2024**: Initial CRM system setup
  - Complete database schema (Leads, Conversations, Activities, Lead Scores, Email Templates, Tasks, Users, Scoring Config)
  - All frontend components with professional design following design_guidelines.md
  - Sidebar navigation with Dashboard, Leads, Conversations, Tasks, Analytics, and Settings pages
  - Lead management interface with filtering and search capabilities
  - AI scoring visualization with progress meters and status badges
  - Theme toggle for light/dark mode support

## Project Structure
```
client/
  src/
    components/      # Reusable UI components
    pages/          # Main page components (Dashboard, Leads, Conversations, Tasks, Team, Automation, Analytics, Settings)
    lib/            # Utilities and configurations
server/
  routes.ts        # API endpoints (leads, users, conversations, tasks, templates, scoring, automation)
  storage.ts       # Database storage interface with hierarchy methods
  automation.ts    # Workflow automation engine with trigger/action execution
  ai.ts           # AI lead scoring and conversation analysis
  ms365.ts        # MS 365 integration with OAuth and email sync
shared/
  schema.ts        # Database schema and types (16 core tables)
```

## User Hierarchy
- **Admin**: Top-level access, manages all users and settings
- **Sales Manager**: Manages team of sales reps, views team performance
- **Sales Rep**: Manages assigned leads, reports to manager

## Database Tables
- `users`: User accounts with role and managerId for hierarchy
- `leads`: Lead information with ownerId for assignment
- `conversations`: Email threads linked to leads
- `activities`: Activity log for lead interactions
- `lead_scores`: AI scoring history
- `email_templates`: Reusable email templates
- `tasks`: Task management with assignments
- `scoring_config`: Customizable AI scoring weights
- `assignment_rules`: Automated lead routing rules
- `automation_rules`: Workflow automation trigger-action configurations
- `automation_logs`: Execution history and error tracking for automations
- `pipelines`: Sales pipeline configurations
- `pipeline_stages`: Pipeline stages with probability and order
- `deals`: Deal tracking with stage and revenue information
- `deal_stage_history`: Historical record of deal progression
- `sync_state`: MS 365 sync state and token storage

## Environment Variables
- `OPENAI_API_KEY`: Required for AI-powered lead scoring
- `DATABASE_URL`: PostgreSQL connection string (auto-configured)
- MS 365 credentials will be configured through the Settings page

## Development Notes
- Using schema-first development approach
- All components follow design guidelines for consistent visual quality
- Lead scoring algorithm analyzes sentiment, engagement, intent, and context
- Email sync will use Microsoft Graph API with OAuth authentication

## Future Automation Enhancements (To Be Implemented)
1. **Auto-conversion Rules**: Automatically convert leads to deals based on criteria
   - Example: "If lead score ≥ 80 AND has responded to 3+ emails, auto-convert to deal"
   - Leverage existing assignment_rules table schema
2. **Trigger-based Pipeline**: Automatically create deals when email keywords/intents detected
   - AI detects buying signals → creates deals automatically
3. **Email-driven Workflows**: Automatically advance deal stages based on email analysis
   - Smart progression through pipeline based on conversation content
4. **Intelligent Lead Assignment**: Auto-assign new leads based on territory, expertise, or workload
