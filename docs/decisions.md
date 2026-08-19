# 技術判断

大きな判断だけ記録する。ファイル名や細かい配置はここに書かない。

## ADR-001: 提示スタックを採用する

採用:

- React + TypeScript + Vite + Tailwind CSS
- Zustand（UI状態のみ。ゲーム規則は入れない）
- Node.js + TypeScript + Hono
- PostgreSQL + Drizzle ORM
- Zod
- pnpm workspace
- Vitest / Playwright
- Docker Compose

理由: 早押しゲームの要件（型安全、リアルタイム、検証可能な規則、将来の対戦）に対して過不足が少ない。既存の個人的好みより、この構成を優先する。

見送り:

- Turborepo（初期は pnpm scripts で足りる）
- Prisma（Drizzle の方がスキーマを TypeScript で追いやすい）
- Redux（ゲーム状態は game-core、UI 状態は Zustand で足りる）

## ADR-002: ゲーム規則は React に置かない

`packages/game-core` を React / DOM / Hono 非依存の TypeScript パッケージにする。

UI は `getView(now)` を描画し、操作は `dispatch(intent)` するだけにする。

## ADR-003: ゲーム状態は有限状態機械 + イベント還元

状態遷移は明示的な phase で表す。時間経過は「期限タイムスタンプと now の比較」で行う。

`setInterval` をゲーム時計にしない。表示用ゲージも `deadlineAt - now` から計算する。画面更新に `requestAnimationFrame` を使うのは許可する。

## ADR-004: 端末間で比較できる時計を持つ

`performance.now()` は端末ローカルの高精度時計であり、そのままでは比較できない。

```ts
interface Clock {
  now(): number; // ローカル高精度
}

interface SyncedClock extends Clock {
  syncedNow(): number; // 共有タイムライン。端末間比較用
  offsetMs: number;
}
```

ゲーム上の押下・期限は `syncedNow()` で記録する。一人練習はオフセット 0。対戦は NTP 風プローブでオフセットを推定する。

本番のローカル時計は `performance.now()`。テストは偽時計。

## ADR-005: 対戦は WebRTC を維持し、星型にする

16 人フルメッシュは DataChannel が最大 120 本になり、ホスト移譲も難しい。

採用: ホスト 1 人をハブにする星型。ホスト切断時は残プレイヤーの席次が最も若い人へ移譲し、ピアを張り直す。

ゲーム進行はホストが一次集約するが、イベントは検証可能な構造にし、ホストのスコアや判定結果を生値として信じない。

代替案として、WebSocket 権威サーバーの方が不正対策と時計同期は簡単である。ただし MVP は一人練習が本体なので、今はスタックを変えず、対戦実装の直前に再評価する。

## ADR-006: Phase 1 では API / 認証 / シグナリングを実装しない

一人練習のゲームループ検証に不要だから。スキーマとパッケージ境界だけ先に決める。

認証は Better Auth を後続で採用する前提とし、ユーザー ID は UUID で設計する。

## ADR-011: Phase 5 で Better Auth を入れ、ログイン成績だけ DB に保存する

採用: メール＋パスワード。OAuth とメール認証は後回し。

未ログインの一人練習は残す。ログイン中の `PlayRepository` だけ API 実装に切り替える。ゲストの localStorage はアカウントへ自動移行しない。

## ADR-007: 問題 ID は内部 UUID、表示番号は別物

- 内部 ID: UUID（PostgreSQL `gen_random_uuid()`）
- ゲーム内番号: そのゲームの 1..N
- ユーザー向け公開番号は今は持たない

問題を編集しても内部 ID は変えない。ID にジャンルや作成順を埋め込まない。

## ADR-008: 難易度は後から実測で入れる

15 段階の列挙型は DB に用意する。問題行の難易度は NULL 許容。算出アルゴリズムは今決めない。

## ADR-009: 問題選出は戦略インターフェース

MVP は完全ランダム。`QuestionSelector` を差し替え可能にし、直近 N 問回避（初期 100）などを後から追加する。

## ADR-010: 入力制限は game-core とサーバーで同じ関数を使う

フロントの UX 制限だけにしない。正規化・文字種判定は `game-core` の純関数にし、API はそれを呼ぶ。
