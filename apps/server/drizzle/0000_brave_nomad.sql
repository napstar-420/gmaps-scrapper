CREATE TABLE "place" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"rating" integer,
	"review_count" integer,
	"phone" text,
	"email" text,
	"link" text NOT NULL,
	"zip_code" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "update_updated_at"()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updated_at" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "place_updated_at"
  BEFORE UPDATE ON "place"
  FOR EACH ROW
  EXECUTE PROCEDURE "update_updated_at"();
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "query_status" AS ENUM('pending', 'in_progress', 'completed', 'failed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE "query" (
	"id" serial PRIMARY KEY NOT NULL,
	"query" text NOT NULL,
	"status" "query_status" DEFAULT 'pending' NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "query_places_mappings" (
	"id" serial PRIMARY KEY NOT NULL,
	"query_id" integer,
	"place_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "query_places_mappings" ADD CONSTRAINT "query_places_mappings_query_id_query_id_fk" FOREIGN KEY ("query_id") REFERENCES "public"."query"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "query_places_mappings" ADD CONSTRAINT "query_places_mappings_place_id_place_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."place"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "query_places_map_query_id_place_id_unique" ON "query_places_mappings" USING btree ("query_id","place_id");
