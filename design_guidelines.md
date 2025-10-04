# CRM Design Guidelines

## Design Approach
**Reference-Based: Modern CRM + Productivity Tools**
Drawing inspiration from Linear, Attio, and Notion for their clean, data-dense interfaces with excellent information hierarchy. Focus on efficiency, clarity, and professional trust.

**Key Principles:**
- Information density without clutter
- Instant visual comprehension of lead status
- Seamless data navigation and filtering
- Professional, business-grade aesthetic

## Core Design Elements

### A. Color Palette

**Light Mode:**
- Primary: 220 95% 50% (Professional blue for actions/branding)
- Background: 0 0% 100% (Pure white workspace)
- Surface: 220 15% 97% (Subtle gray for cards/panels)
- Borders: 220 13% 91% (Soft separation)
- Text Primary: 220 15% 20%
- Text Secondary: 220 10% 45%

**Dark Mode:**
- Primary: 220 95% 55% (Slightly lighter for contrast)
- Background: 220 15% 10% (Deep charcoal)
- Surface: 220 13% 15% (Elevated panels)
- Borders: 220 13% 22% (Subtle boundaries)
- Text Primary: 220 15% 95%
- Text Secondary: 220 10% 65%

**Lead Status Colors (Both Modes):**
- Cold: 200 80% 55% (Cool blue-cyan)
- Warm: 35 92% 55% (Vibrant orange)
- Hot: 0 85% 60% (Energetic red)
Use as badges, status indicators, and filter pills

### B. Typography
**Font Stack:** Inter (primary), system-ui (fallback)
- Display/Headers: 600 weight, tracking-tight
- Body Text: 400 weight, leading-relaxed
- Data/Metrics: 500 weight (tabular-nums)
- Labels: 500 weight, text-sm, uppercase tracking-wide

**Hierarchy:**
- Page Titles: text-2xl to text-3xl
- Section Headers: text-lg to text-xl
- Card Titles: text-base font-semibold
- Body/Data: text-sm
- Captions/Labels: text-xs

### C. Layout System
**Spacing Primitives:** Use Tailwind units of 2, 4, 6, 8, 12, 16
- Component padding: p-4 to p-6
- Section gaps: gap-6 to gap-8
- Page margins: px-8, py-6
- Card spacing: p-4 internally, gap-4 between elements

**Grid Structure:**
- Sidebar navigation: 280px fixed width
- Main content: Fluid with max-w-7xl container
- Data tables: Full width with horizontal scroll
- Three-column dashboard: grid-cols-3 on lg+

### D. Component Library

**Navigation:**
- Fixed left sidebar (280px) with collapsible groups
- Top header with search, notifications, user profile
- Breadcrumb navigation for deep hierarchies
- Command palette (Cmd+K) for quick actions

**Data Display:**
- Lead cards: Compact, scannable with status badges, last contact, score prominently displayed
- Conversation threads: Email-style with threading, timestamps, and sender avatars
- Score meter: Progress bar with color gradient matching lead temperature
- Tables: Striped rows, sortable columns, inline actions, sticky headers

**Forms & Inputs:**
- Floating labels for text inputs
- Inline validation with subtle error states
- Multi-select dropdowns for tags/categories
- Rich text editor for email composition
- Date/time pickers with calendar popover

**Dashboard Widgets:**
- Metric cards: Large number, trend indicator, sparkline chart
- Lead funnel visualization: Horizontal bar chart showing cold→warm→hot conversion
- Activity timeline: Chronological log with action types
- Quick filters: Pill-style toggles for status, date ranges, assigned users

**Lead Scoring Display:**
- Circular progress indicator (0-100 scale)
- Color-coded segments: 0-33 cold, 34-66 warm, 67-100 hot
- Contextual factors shown as bullet points below score
- Real-time updates with subtle animation

**Email Integration Panel:**
- Two-pane layout: Thread list + conversation view
- Compose overlay with full formatting tools
- Smart reply suggestions powered by AI
- Automatic lead matching and conversation threading

**Overlays:**
- Modal dialogs: Centered, with backdrop blur
- Slide-over panels: From right for detail views (480px wide)
- Toast notifications: Top-right, auto-dismiss with action buttons
- Dropdown menus: Elevated shadow, rounded corners

### E. Interactions
**Minimal Animations:**
- Smooth transitions for modal/panel open (200ms ease)
- Hover states: Subtle background color shift, no dramatic effects
- Loading states: Skeleton screens for data tables, spinner for actions
- No scroll-triggered animations or parallax effects

## Images
**No Hero Image:** This is a productivity application—users log in directly to their dashboard. Focus on clean, functional UI rather than marketing imagery.

**Avatar/Profile Images:**
- Lead contact photos: 40px circles in lists, 80px in detail views
- User avatars: 32px in navigation, 24px in activity logs
- Company logos: 48px squares in lead cards

**Placeholder States:**
- Empty state illustrations: Simple, friendly SVG graphics (not photos)
- Use illustrations for: "No leads yet", "No conversations", "No activity"

## Layout Specifications

**Dashboard (Home):**
- Top metrics row: 4 KPI cards (total leads, conversion rate, avg score, active conversations)
- Middle section: Lead funnel chart + Recent activity timeline (2-column)
- Bottom: Quick filters + Lead table with pagination

**Lead Detail View:**
- Split layout: Lead info sidebar (360px) + Main content area
- Sidebar: Contact card, score display, tags, assigned user, custom fields
- Main area: Tabbed interface (Conversations, Activity, Notes, Tasks)
- Floating action button for quick email compose

**Conversations View:**
- Three-pane: Thread list (320px) | Conversation (fluid) | Lead context panel (340px)
- Thread list: Searchable, filterable, shows preview of last message
- Conversation: Full email thread with inline reply
- Context panel: Lead score, recent activity, quick notes

**Settings/Configuration:**
- Two-column: Navigation sidebar (240px) + Content area
- Sections: Integration settings, scoring rules, user management, customization

This design creates a powerful, professional CRM that prioritizes data clarity and workflow efficiency while maintaining visual polish.