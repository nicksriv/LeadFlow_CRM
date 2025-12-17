CREATE TABLE "apify_results" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"email" text,
	"job_title" text,
	"linkedin_url" text,
	"company_name" text,
	"company_domain" text,
	"location" text,
	"industry" text,
	"search_criteria" jsonb,
	"matched_profile_id" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "snovio_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" varchar,
	"profile_url" text,
	"action" text NOT NULL,
	"status" text NOT NULL,
	"credits_used" integer DEFAULT 0,
	"response_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scraped_profiles" DROP CONSTRAINT "scraped_profiles_url_unique";--> statement-breakpoint
ALTER TABLE "linkedin_sessions" ALTER COLUMN "user_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "scraped_profiles" ADD COLUMN "user_id" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "scraped_profiles" ADD COLUMN "company" text;--> statement-breakpoint
ALTER TABLE "scraped_profiles" ADD COLUMN "email_confidence" integer;--> statement-breakpoint
ALTER TABLE "scraped_profiles" ADD COLUMN "about" text;--> statement-breakpoint
ALTER TABLE "scraped_profiles" ADD COLUMN "skills" text[] DEFAULT ARRAY[]::text[];--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_hash" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snovio_logs" ADD CONSTRAINT "snovio_logs_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linkedin_sessions" ADD CONSTRAINT "linkedin_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scraped_profiles" ADD CONSTRAINT "scraped_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;