CREATE TYPE "public"."status" AS ENUM('pending', 'running', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "agent_schema"."run_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"worker_data" varchar(128),
	"sequence" integer NOT NULL,
	"step_key" text NOT NULL,
	"type" varchar(32) NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_schema"."runs" ALTER COLUMN "goal" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "agent_schema"."runs" ALTER COLUMN "model" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "agent_schema"."runs" ADD COLUMN "status" "status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_schema"."runs" ADD COLUMN "fail_reason" varchar(64);--> statement-breakpoint
ALTER TABLE "agent_schema"."runs" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_schema"."runs" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_schema"."run_events" ADD CONSTRAINT "run_events_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "agent_schema"."runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "runs_status_created_status" ON "agent_schema"."runs" USING btree ("created_at","status");