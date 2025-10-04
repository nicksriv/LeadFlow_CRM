# LeadFlow CRM

## Overview
A comprehensive CRM system with MS 365 mailbox integration and AI-powered lead scoring. Built with React, Express, PostgreSQL, and OpenAI GPT-5.

## Features
- **Lead Management**: Complete CRUD operations for managing leads with detailed information
- **AI-Powered Scoring**: Automatic lead scoring (0-100) using OpenAI to analyze email conversations
- **Status Classification**: Intelligent categorization into Cold (0-33), Warm (34-66), and Hot (67-100) leads
- **Email Sending**: Send emails directly from CRM with email template support
- **Email Templates**: Create and manage reusable email templates
- **MS 365 Integration**: Sync email conversations from Microsoft 365 mailbox
- **Conversation Tracking**: View all email threads associated with each lead
- **Task Management**: Create tasks and follow-up reminders for each lead
- **Activity Timeline**: Comprehensive activity log for all lead interactions
- **Advanced Scoring Configuration**: Customizable weighted criteria for AI scoring algorithm
- **Analytics Dashboard**: Insights into lead pipeline performance and conversion metrics
- **Dark Mode**: Full dark mode support throughout the application

## Architecture
- **Frontend**: React with TypeScript, Wouter for routing, React Query for data fetching
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **AI**: OpenAI GPT-5 for conversation analysis and lead scoring
- **Styling**: Tailwind CSS with Shadcn UI components

## Recent Changes
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
    pages/          # Main page components (Dashboard, Leads, Conversations, Tasks, Team, Analytics, Settings)
    lib/            # Utilities and configurations
server/
  routes.ts        # API endpoints (leads, users, conversations, tasks, templates, scoring)
  storage.ts       # Database storage interface with hierarchy methods
shared/
  schema.ts        # Database schema and types (8 core tables)
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

## Environment Variables
- `OPENAI_API_KEY`: Required for AI-powered lead scoring
- `DATABASE_URL`: PostgreSQL connection string (auto-configured)
- MS 365 credentials will be configured through the Settings page

## Development Notes
- Using schema-first development approach
- All components follow design guidelines for consistent visual quality
- Lead scoring algorithm analyzes sentiment, engagement, intent, and context
- Email sync will use Microsoft Graph API with OAuth authentication
