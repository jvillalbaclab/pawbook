CREATE SCHEMA "pets";
--> statement-breakpoint
CREATE TABLE "pets"."caretakers" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"first_name" text,
	"show_first_name" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pets"."pets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" uuid NOT NULL,
	"handle" text NOT NULL,
	"name" text NOT NULL,
	"species" text NOT NULL,
	"sex" text NOT NULL,
	"breed" text,
	"birth_month" date,
	"bio" text,
	"favorite_toy" text,
	"favorite_treat" text,
	"avatar_media_id" uuid,
	"cover_media_id" uuid,
	"handle_changed_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "pets_handle_format" CHECK ("pets"."pets"."handle" ~ '^[a-z0-9_.]{3,30}$'),
	CONSTRAINT "pets_species_valid" CHECK ("pets"."pets"."species" in ('dog', 'cat')),
	CONSTRAINT "pets_sex_valid" CHECK ("pets"."pets"."sex" in ('female', 'male'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "pets_handle_lower_key" ON "pets"."pets" USING btree (lower("handle"));--> statement-breakpoint
CREATE INDEX "pets_owner_active_idx" ON "pets"."pets" USING btree ("owner_id","id") WHERE "pets"."pets"."archived_at" is null;