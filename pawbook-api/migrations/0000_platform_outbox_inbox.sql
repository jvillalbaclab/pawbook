CREATE SCHEMA "platform";
--> statement-breakpoint
CREATE TABLE "platform"."inbox_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"external_id" text NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform"."outbox" (
	"id" uuid PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"published_at" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text
);
--> statement-breakpoint
CREATE UNIQUE INDEX "inbox_events_source_external_id_key" ON "platform"."inbox_events" USING btree ("source","external_id");--> statement-breakpoint
CREATE INDEX "outbox_unpublished_idx" ON "platform"."outbox" USING btree ("id") WHERE "platform"."outbox"."published_at" is null;