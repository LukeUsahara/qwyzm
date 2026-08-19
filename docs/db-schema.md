# DB 初期スキーマ

PostgreSQL + Drizzle。Phase 1 ではスキーマ定義までを目標にし、実行中の API には接続しない。

問題 ID は UUID。連番やジャンル符号を埋め込まない。編集しても ID は不変。

## ER 概要

```text
users
  └── games (host)
        ├── game_players
        ├── game_questions ── questions
        └── question_play_records ── questions / users

genres (self parent_id)
  └── question_genres ── questions

questions
  └── question_answers  (correct | close)
```

## 列挙

```text
game_mode:            solo | custom_room
win_condition:        first_to_points | highest_after_n
miss_penalty:         none | minus_points
wrong_answer_rule:    resume_from_position | end_question | no_one_else | reread | next_fastest
reveal_speed:         slow | normal | fast
answer_kind:          correct | close
play_result:          correct | incorrect | unanswered | withdrawn
difficulty_rank:      c_minus .. ss_plus  （15段階。NULL 可）
difficulty_band:      easy | normal | slightly_hard | hard | extreme
```

難易度 15 段階と 5 大分類の対応:

| 大分類 | 段階 |
| --- | --- |
| 簡単 | C- C C+ |
| 普通 | B- B B+ |
| 微難問 | A- A A+ |
| 難問 | S- S S+ |
| 超難問 | SS- SS SS+ |

`difficulty_rank` は後から実測で埋める。今は NULL。集計用に play 記録を残す。

## テーブル

### users

認証は Better Auth。`users` は Better Auth の user テーブル（`display_name` が `name`）。

- `id` UUID PK
- `display_name` TEXT NOT NULL（Better Auth `name`）
- `handle` TEXT UNIQUE（ユーザーに見せる ID。登録後は変更しない）
- `email` TEXT UNIQUE NOT NULL
- `email_verified` BOOLEAN NOT NULL DEFAULT false
- `avatar_url` TEXT NULL（Better Auth `image`）
- `created_at` / `updated_at` TIMESTAMPTZ

### genres

階層。1 問に複数ジャンル。

- `kind` `main` | `unique` NOT NULL DEFAULT `main`
- `id` UUID PK
- `parent_id` UUID NULL REFERENCES genres(id)
- `slug` TEXT UNIQUE NOT NULL
- `name` TEXT NOT NULL
- `sort_order` INT NOT NULL DEFAULT 0

本ジャンルは木構造。出題の「全て」はすべての本ジャンル葉を対象にする。ユニークジャンルは別枠で、含めない限りマッチキーにしない。

### questions

- `id` UUID PK
- `body` TEXT NOT NULL
- `created_by` UUID NULL REFERENCES users(id)
- `status` TEXT NOT NULL DEFAULT `official`  
  将来: `draft` / `user` / `official`。今は official のみ使う
- `difficulty_rank` TEXT NULL
- `source_text` TEXT NULL（将来。今は使わない）
- `source_url` TEXT NULL
- `created_at` / `updated_at` TIMESTAMPTZ
- `deleted_at` TIMESTAMPTZ NULL

読み上げ用アクセント、出典必須、コイン付与は今作らない。出典は NULL 列だけ先に置く。

### question_answers

- `id` UUID PK
- `question_id` UUID NOT NULL REFERENCES questions(id)
- `kind` answer_kind NOT NULL
- `display_text` TEXT NOT NULL
- `normalized_text` TEXT NOT NULL
- `reveal` TEXT NOT NULL DEFAULT `silent`  
  カタログ上は想定解 1 つ（必須）と任意の別称。判定のみはその下にぶら下がり、入力解だけ持つ。  
  行の並びは `sort_order`。`primary` のあとの `silent` はその想定解の判定のみ。`alternate` が別称の開始で、そのあとの `silent` はその別称の判定のみ。  
  プレイ判定では平坦な正解一覧に展開する。別称（とその判定のみ）で当てたときだけ結果に `想定解（別称）` と出す。  
  惜しい解答は `kind = close`。画面に出さないので `display_text` は空でよい。
- `sort_order` INT NOT NULL DEFAULT 0

UNIQUE `(question_id, kind, normalized_text)`。

### question_genres

- `question_id` UUID REFERENCES questions(id)
- `genre_id` UUID REFERENCES genres(id)
- PRIMARY KEY (question_id, genre_id)

### games

- `id` UUID PK
- `mode` game_mode NOT NULL
- `host_user_id` UUID NULL
- `question_count` INT NOT NULL CHECK (1..100)
- `win_condition` win_condition NOT NULL
- `target_points` INT NULL
- `correct_points` INT NOT NULL CHECK (>= 1)
- `miss_penalty` miss_penalty NOT NULL
- `miss_points` INT NULL CHECK (>= 1)
- `wrong_answer_rule` wrong_answer_rule NOT NULL
- `reveal_speed` reveal_speed NOT NULL
- `started_at` / `ended_at` TIMESTAMPTZ
- `settings` JSONB NOT NULL DEFAULT `{}`  
  選択ジャンル ID 配列などをスナップショット

### game_players

- `id` UUID PK
- `game_id` UUID NOT NULL
- `user_id` UUID NULL（未ログイン一人練習は NULL）
- `seat_index` INT NOT NULL
- `display_name` TEXT NOT NULL
- `is_host` BOOLEAN NOT NULL
- `score` INT NOT NULL DEFAULT 0
- `rank` INT NULL
- `withdrawn` BOOLEAN NOT NULL DEFAULT false
- UNIQUE (game_id, seat_index)

### game_questions

そのゲームで出た問題と順番。ゲーム内番号はここ。

- `id` UUID PK
- `game_id` UUID NOT NULL
- `question_id` UUID NOT NULL
- `order_index` INT NOT NULL
- UNIQUE (game_id, order_index)

### question_play_records

問題ごとの成績。将来の成長分析の最小単位。

- `id` UUID PK
- `game_id` UUID NOT NULL
- `game_question_id` UUID NOT NULL
- `question_id` UUID NOT NULL
- `user_id` UUID NULL
- `player_seat` INT NOT NULL
- `result` play_result NOT NULL
- `question_body` TEXT NOT NULL
- `answer_raw` TEXT NULL
- `answer_normalized` TEXT NULL
- `answer_display` TEXT NOT NULL
- `genre_ids` JSONB NOT NULL
- `buzz_time_ms` DOUBLE PRECISION NULL  
  問題開始（reading 開始）からの経過。高精度のため整数 ms に落とさない
- `buzz_char_index` INT NULL  
  押した時点の可視文字数（0 始まり）
- `buzz_rank` INT NULL  
  その問題での押下順位（1 始まり）
- `answer_start_ms` DOUBLE PRECISION NULL  
  解答権取得から入力開始まで
- `answer_submit_ms` DOUBLE PRECISION NULL  
  解答権取得から確定まで
- `close_count` INT NOT NULL DEFAULT 0
- `created_at` TIMESTAMPTZ

インデックス:

- `(question_id, user_id, created_at DESC)` 成績・直近 N 問回避
- `(user_id, created_at DESC)`
- `(game_id)`

直近 N 問回避は専用テーブルを持たず、この記録から取る。初期 N = 100。

## 難易度算出のために今やっておくこと

アルゴリズムは決めない。次があれば後から計算できる。

- 問題 ID 単位の play 記録
- 正誤、押下位置、押下時間、回答時間
- ユーザー ID（ログイン後）

集計テーブルは今作らない。必要になってから materialized view または `question_stats` を足す。

## 将来テーブル（今作らない）

- フレンド
- ユーザー作成問題の出典・審査
- コイン
- 読み上げアクセント
- ランダムマッチング

## Phase 5 での使い方

問題とジャンルは PostgreSQL が正本。ログイン中の一人練習成績も `games` 系テーブルへ保存する。`question_play_records` には本文・表示正解・ジャンル ID のスナップショットを持つ。未ログインの成績は localStorage。

