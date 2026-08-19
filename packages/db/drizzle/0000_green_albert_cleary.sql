CREATE TYPE "public"."answer_kind" AS ENUM('correct', 'close');--> statement-breakpoint
CREATE TYPE "public"."answer_reveal" AS ENUM('primary', 'silent', 'alternate');--> statement-breakpoint
CREATE TYPE "public"."difficulty_rank" AS ENUM('C-', 'C', 'C+', 'B-', 'B', 'B+', 'A-', 'A', 'A+', 'S-', 'S', 'S+', 'SS-', 'SS', 'SS+');--> statement-breakpoint
CREATE TYPE "public"."game_mode" AS ENUM('solo', 'custom_room');--> statement-breakpoint
CREATE TYPE "public"."miss_penalty" AS ENUM('none', 'minus_points');--> statement-breakpoint
CREATE TYPE "public"."play_result" AS ENUM('correct', 'incorrect', 'unanswered', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."question_status" AS ENUM('official', 'draft', 'user');--> statement-breakpoint
CREATE TYPE "public"."reveal_speed" AS ENUM('slow', 'normal', 'fast');--> statement-breakpoint
CREATE TYPE "public"."win_condition" AS ENUM('first_to_points', 'highest_after_n');--> statement-breakpoint
CREATE TYPE "public"."wrong_answer_rule" AS ENUM('resume_from_position', 'end_question', 'no_one_else', 'reread', 'next_fastest');--> statement-breakpoint
CREATE TABLE "game_players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"user_id" uuid,
	"seat_index" integer NOT NULL,
	"display_name" text NOT NULL,
	"is_host" boolean DEFAULT false NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"rank" integer,
	"withdrawn" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"order_index" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "games" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mode" "game_mode" NOT NULL,
	"host_user_id" uuid,
	"question_count" integer NOT NULL,
	"win_condition" "win_condition" NOT NULL,
	"target_points" integer,
	"correct_points" integer NOT NULL,
	"miss_penalty" "miss_penalty" NOT NULL,
	"miss_points" integer,
	"wrong_answer_rule" "wrong_answer_rule" NOT NULL,
	"reveal_speed" "reveal_speed" NOT NULL,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "genres" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "genres_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "question_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"kind" "answer_kind" NOT NULL,
	"display_text" text NOT NULL,
	"normalized_text" text NOT NULL,
	"reveal" "answer_reveal" DEFAULT 'silent' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_genres" (
	"question_id" uuid NOT NULL,
	"genre_id" uuid NOT NULL,
	CONSTRAINT "question_genres_question_id_genre_id_pk" PRIMARY KEY("question_id","genre_id")
);
--> statement-breakpoint
CREATE TABLE "question_play_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"game_question_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"user_id" uuid,
	"player_seat" integer NOT NULL,
	"result" "play_result" NOT NULL,
	"answer_raw" text,
	"answer_normalized" text,
	"buzz_time_ms" double precision,
	"buzz_char_index" integer,
	"buzz_rank" integer,
	"answer_start_ms" double precision,
	"answer_submit_ms" double precision,
	"close_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"body" text NOT NULL,
	"created_by" uuid,
	"status" "question_status" DEFAULT 'official' NOT NULL,
	"difficulty_rank" "difficulty_rank",
	"source_text" text,
	"source_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_name" text NOT NULL,
	"handle" text NOT NULL,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_handle_unique" UNIQUE("handle")
);
--> statement-breakpoint
ALTER TABLE "game_players" ADD CONSTRAINT "game_players_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_questions" ADD CONSTRAINT "game_questions_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_questions" ADD CONSTRAINT "game_questions_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "genres" ADD CONSTRAINT "genres_parent_id_genres_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."genres"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_answers" ADD CONSTRAINT "question_answers_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_genres" ADD CONSTRAINT "question_genres_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_genres" ADD CONSTRAINT "question_genres_genre_id_genres_id_fk" FOREIGN KEY ("genre_id") REFERENCES "public"."genres"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_play_records" ADD CONSTRAINT "question_play_records_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_play_records" ADD CONSTRAINT "question_play_records_game_question_id_game_questions_id_fk" FOREIGN KEY ("game_question_id") REFERENCES "public"."game_questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_play_records" ADD CONSTRAINT "question_play_records_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "question_answers_question_kind_normalized_idx" ON "question_answers" USING btree ("question_id","kind","normalized_text");--> statement-breakpoint
CREATE INDEX "question_play_records_question_id_idx" ON "question_play_records" USING btree ("question_id");