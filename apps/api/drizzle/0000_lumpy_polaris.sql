CREATE SCHEMA "agent_schema";
--> statement-breakpoint
CREATE TYPE "public"."model" AS ENUM('claude-sonnet-4-5', 'claude-haiku-4-5', 'claude-opus-4-5', 'claude-opus-4-6', 'claude-sonnet-4-6', 'claude-opus-4-7', 'claude-sonnet-5', 'claude-opus-5', 'claude-fable-5-1');--> statement-breakpoint
CREATE TABLE "agent_schema"."runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"goal" varchar(255),
	"model" "model" DEFAULT 'claude-haiku-4-5' NOT NULL
);
