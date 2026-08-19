# アーキテクチャ

## 現状のリポジトリ

調査時点（2026-08-17）:

- Git リポジトリは初期化済み
- ブランチは `master`
- コミットなし
- リモートなし
- アプリケーションコードなし

既存実装は再利用対象がない。これから構成する。既存コードを消す作業は発生しない。

## 原則

1. ゲーム規則と UI を分離する
2. 時間判定はタイムスタンプ比較で行う
3. クライアント値を無条件に信用しない
4. 将来機能は拡張点だけ用意し、今は実装しない
5. 一人練習だけで規則を完結して検証できる

## 論理構成

```
[操作] キー / クリック / 入力
   ↓ intent
[game-core]  状態機械・判定・得点・進行
   ↓ view (now から派生)
[web UI]  描画のみ
   ↓ （後続）events
[host peer / api]  集約・永続化・検証
```

一人練習の規則はブラウザ内の `game-core` で完結する。問題カタログだけ API から取る。対戦の規則も同じ `game-core` を signaling 上で動かす。

## ディレクトリ

```
apps/
  web/              # React + Vite。一人練習 UI とカスタム部屋
  api/              # Hono。認証・問題・成績・内部出題 API
  signaling/        # 権威 WebSocket。ロビーと対戦ループ。DB は開かない

packages/
  game-core/        # ゲーム規則。React / DOM 非依存。永続化を持たない
  play-data/        # 問題カタログ型、プレイ成績の Repository と集計
  shared/           # 定数、ID 型、共通ユーティリティ
  validation/       # HTTP / WS 用 Zod。game-core の純関数を再利用
  db/               # Drizzle スキーマとマイグレーション

tests/
  e2e/              # Playwright

docs/               # 本ディレクトリ
```

`apps/signaling` を `api` に埋め込まない。REST と長寿命 WebSocket はスケール特性が違う。対戦の出題は API `POST /internal/play-questions`（`x-internal-token`）経由。signaling は PGlite / `packages/db` を開かない。

## パッケージ依存

依存は必ず下向きにする。

```
apps/web --------+----> packages/game-core ----+
                 |                             |
                 +----> packages/play-data ----+--> packages/shared
                 |                             |
apps/api --------+----> packages/db -----------+
                 |      (QuestionRepository)   |
                 +----> packages/play-data     |
                 |                             |
apps/signaling --+----> packages/game-core     |
                 +----> packages/validation ---+
```

`play-data` は `QuestionRepository` / `PlayRepository` の抽象を持つ。ゲーム規則はストレージを知らない。問題の実体は PostgreSQL、一人練習の成績はまだブラウザ内。

禁止:

- `game-core` が `react` / `hono` / `apps/*` に依存すること
- UI コンポーネントが得点計算や早押し勝者決定を持つこと
- Zustand ストアがゲーム規則の正本になること

## フロントの責務分割

Zustand に置いてよいもの:

- 選択中ジャンルなどの画面状態
- キーバインド設定（将来）
- サイドバー開閉

Zustand に置いてはいけないもの:

- 現在の phase
- 得点
- 早押し判定
- 残り時間の正本

ゲーム正本は `GameEngine`。UI は毎フレーム `engine.getView(performance.now())` を読む。

## レイアウト構造（UI）

実装詳細のピクセル配置は自由に決める。構造だけ固定する。

```
+------------------+----------------------------------+
| 自分のプロフィール | ゲームサブウィンドウ               |
| 画像 / 名前 / ID  | 問題番号 / 状態 / ゲージ            |
| ジャンル別レーダー | プレイヤー一覧（点・順位）          |
| フレンド           | 早押しボタン / 回答欄              |
|                  | 出題中のみ問題文                   |
+------------------+----------------------------------+
```

Phase 1 のプロフィールはプレースホルダ。レーダーとフレンドは枠だけ。

問題文は出題中（`reading` / `waitingBuzz`）だけ描画する。`answering*` では DOM にも残さない。

## リアルタイム

```
client A  --WS-->  apps/signaling (GameEngine 正本)
client B  --WS-->       |
                        +-- HTTP POST /internal/play-questions --> apps/api --> db
```

クライアントは `buzz` / `answer_*` を送り、サーバーは視聴者ごとの `PublicGameView` を `state` で返す。得点・判定・出題順をクライアントは信じない。

## 認証

Better Auth + Drizzle adapter。メール＋パスワード。`handle` は登録時のみ。ログイン中の一人練習成績は PostgreSQL に保存する。未ログインは localStorage。ロールはゲスト（未ログイン）/ 一般 / 管理者。管理者だけ公式問題を編集できる。
