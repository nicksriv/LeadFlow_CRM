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

## External Dependencies
- **OpenAI GPT-5**: Used for all AI-powered features, including lead scoring, conversation analysis, summarization, email drafting, and predictive analytics.
- **Microsoft Graph API**: Utilized for Microsoft 365 mailbox integration, including OAuth 2.0 authentication, email synchronization (fetching and sending), and real-time webhook notifications.
- **PostgreSQL**: The primary relational database for all application data storage.