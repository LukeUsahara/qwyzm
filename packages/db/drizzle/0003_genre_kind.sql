CREATE TYPE "public"."genre_kind" AS ENUM('main', 'unique');--> statement-breakpoint
ALTER TABLE "genres" ADD COLUMN "kind" "genre_kind" DEFAULT 'main' NOT NULL;
