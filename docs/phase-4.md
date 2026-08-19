# Phase 4

問題データを PostgreSQL に移し、API 経由で一人練習へ渡す。対戦・認証・WebRTC・ユーザー問題作成は対象外。成績のサーバー保存もしない。

## 現状

- 出題は `apps/web/src/fixtures/` の配列
- カタログ型は `QuestionCatalogItem`（`@qwyzm/play-data`）
- プレイ成績は `PlayRepository` + localStorage。今回は触らない
- `packages/db` に Drizzle スキーマ定義あり。マイグレーション未実行
- `apps/api` は `/health` のみ
- `question_play_records.question_id` は既にある。問題単位統計の土台は壊さない

## 方針

```
PostgreSQL
  ↓ Drizzle
packages/db QuestionRepository 実装
  ↓
apps/api (Hono)
  ↓ HTTP
apps/web QuestionRepository 実装
  ↓ toPlayQuestion()
game-core（DB を知らない）
```

- `QuestionRepository` を `play-data` に置く（`PlayRepository` と同列）
- game-core は配列の `Question` だけを受ける
- React は fetch しない。Repository 経由
- 成績は従来どおりブラウザ内。`QuestionPlayRecord` は維持

## DB

既存スキーマを使う。ユーザー案の `text` / `answers` / `near_answers` は、既定の形に合わせる。

| 概念 | 実装 |
| --- | --- |
| 問題文 | `questions.body`（ドメインも `body`） |
| 複数正解 | `question_answers.kind = correct` |
| 惜しい回答 | `question_answers.kind = close` |
| ジャンル階層 | `genres.parent_id` |
| 多対多 | `question_genres` |

id は既存フィクスチャの UUID を維持。編集しても変えない。

今ある将来枠（実装しない）:

- `status` official / draft / user
- `created_by`
- `difficulty_rank` NULL
- `source_text` / `source_url` NULL（列だけ）

読み上げテーブルは今作らない。カタログ型の `tts` は任意のまま。

問題統計テーブルは作らない。集計は後で `question_play_records` を `question_id` 単位で見る。全問題横断の平均押下位置は出さない。

seed は upsert。同じ ID なら更新し、回答・ジャンル紐付けは置き換える。複数回実行しても行は増えない。

## API

```
GET /health
GET /genres
GET /questions
GET /questions?genreIds=<uuid>,<uuid>
GET /questions/:id
```

- `genreIds` なし / 空（`allMain` 省略時）= 本ジャンル全て
- `allMain=0` で本ジャンルを絞る。親 ID は葉へ展開
- `includeUnique=1` でユニークジャンルをマッチキーに含める
- 複数ジャンルは和集合
- ページネーション・全文検索は作らない

## 選出

今回はランダム（既存 `pickQuestions`）。`QuestionPickStrategy` だけ用意し、未出題優先などは後から差し替える。

## Web

起動時にジャンルと問題を API から取る。ジャンル変更のたびに `listQuestions`。一人練習の FSM・成績画面は変えない。

## テスト

- メモリ Repository: 一覧 / ID / ジャンル / 親 / 複数 / 複数正解 / 惜しい
- PGlite: migration・seed 冪等・同じ取得系
- API: 上記を HTTP で

Docker 上の Postgres は任意。手元に PostgreSQL 16/18 が 5432/5433 を使っている環境では、既定はファイルの PGlite。`DATABASE_URL=postgres://...` のときだけサーバー Postgres に接続する。Compose を使う場合のホストポートは 5434。
