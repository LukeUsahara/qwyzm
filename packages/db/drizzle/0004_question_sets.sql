CREATE TYPE "public"."question_set_visibility" AS ENUM('official', 'private');--> statement-breakpoint
CREATE TYPE "public"."question_set_source" AS ENUM('filter', 'manual');--> statement-breakpoint
CREATE TABLE "question_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid,
	"name" text NOT NULL,
	"visibility" "question_set_visibility" DEFAULT 'private' NOT NULL,
	"source" "question_set_source" NOT NULL,
	"criteria" jsonb DEFAULT '{"allMain":true,"selectedGenreIds":[],"includeUnique":false,"selectedUniqueGenreIds":[]}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "question_set_items" (
	"set_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"order_index" integer NOT NULL,
	CONSTRAINT "question_set_items_set_id_question_id_pk" PRIMARY KEY("set_id","question_id")
);--> statement-breakpoint
ALTER TABLE "question_sets" ADD CONSTRAINT "question_sets_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_set_items" ADD CONSTRAINT "question_set_items_set_id_question_sets_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."question_sets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_set_items" ADD CONSTRAINT "question_set_items_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;
