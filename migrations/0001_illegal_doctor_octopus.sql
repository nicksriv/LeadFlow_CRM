CREATE TABLE "scraped_profiles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"headline" text,
	"location" text,
	"url" text NOT NULL,
	"email" text,
	"avatar" text,
	"scraped_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "scraped_profiles_url_unique" UNIQUE("url")
);
