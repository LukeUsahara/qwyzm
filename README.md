# QWYZM（クイズム）

Webブラウザで動作する早押しクイズゲーム。

現在は Phase 6：ロールと公式問題の編集。手元開発の既定 DB は PGlite です。

## 開発（Docker 不要）

```bash
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev
```

- Web: http://localhost:5173
- API: http://localhost:8787
- DB: `packages/db/data/pglite`（ファイル）

初回または Phase 5 以降はマイグレーションを再実行してください。

ログインすると一人練習の成績がアカウントに保存されます。未ログインの成績はこのブラウザの localStorage だけです。管理者で入ると左パネルから公式問題を編集できます。

問題を取り直すとき:

```bash
pnpm db:seed
```

seed は同じ ID を更新するだけなので、何度実行しても重複しません。

## Docker で PostgreSQL を使う場合

Docker Desktop が必要です。CLI だけ入っていてもデーモンが無いと動きません。

このマシンでは PostgreSQL 16 が 5432、18 が 5433 を使っていることが多いので、Compose は **5434** です。

```bash
docker compose up -d
set DATABASE_URL=postgres://qwyzm:qwyzm@localhost:5434/qwyzm
pnpm db:migrate
pnpm db:seed
pnpm dev
```

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

## ドキュメント

| 文書 | 内容 |
| --- | --- |
| [docs/architecture.md](docs/architecture.md) | 全体構成 |
| [docs/decisions.md](docs/decisions.md) | 技術判断 |
| [docs/game-fsm.md](docs/game-fsm.md) | ゲーム状態機械 |
| [docs/db-schema.md](docs/db-schema.md) | DB 初期スキーマ |
| [docs/test-strategy.md](docs/test-strategy.md) | テスト方針 |
| [docs/phase-1.md](docs/phase-1.md) | Phase 1 範囲 |
| [docs/phase-2.md](docs/phase-2.md) | Phase 2 ジャンルと成績 |
| [docs/phase-3.md](docs/phase-3.md) | Phase 3 成績蓄積と成長分析 |
| [docs/phase-4.md](docs/phase-4.md) | Phase 4 問題データの DB / API |
| [docs/phase-5.md](docs/phase-5.md) | Phase 5 認証と成績のユーザー紐付け |
| [docs/phase-6.md](docs/phase-6.md) | Phase 6 ロールと公式問題編集 |
| [docs/spec-issues.md](docs/spec-issues.md) | 確定した仕様 |
