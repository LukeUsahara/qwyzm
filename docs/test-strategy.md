# テスト戦略

ゲーム規則の正しさが本体。UI のスナップショットより `game-core` の状態遷移を厚くする。

## 層

| 層 | ツール | 対象 | Phase 1 |
| --- | --- | --- | --- |
| 単位 | Vitest | game-core の FSM、正規化、判定、得点、勝利 | 必須 |
| 単位 | Vitest | validation / 純関数 | スキーマ導入時 |
| コンポーネント | Vitest + Testing Library | ボタン disabled、本文の出し分け | 最小 |
| E2E | Playwright | 一人練習のゲームループ | UI 接続後 |
| 契約 | 後続 | WS / WebRTC イベント | しない |

## 偽時計

`Clock` を差し替える。`vi.useFakeTimers()` にゲーム規則を載せない。

```ts
class FakeClock {
  nowMs = 0;
  now() { return this.nowMs; }
  advance(ms: number) { this.nowMs += ms; }
}
```

テストは `advance` のあと `dispatch(TICK)` する。時間経過で起きる遷移をこれで検証する。

## game-core で必ず書くケース

プレビュー:

- 1 秒未満は本文なし、早押し無視
- 1 秒ちょうどで reading

文字送り:

- 経過時間から可視文字数が決まる
- 速度定数を変えると可視文字数が変わる
- 全文で waitingBuzz

早押し:

- reading 中の buzz で本文が view から消える
- 押下時刻と charIndex が記録される
- 早押し不可フェーズの buzz は無視
- 誤答ロック後の buzz は無視

回答:

- 5 秒未入力は不正解
- 入力開始で 7 秒に切り替わる
- 正解
- 複数正解のいずれか
- 惜しい → 再入力 → 正解
- 惜しい 2 連続は不正解
- 7 秒切れは不正解
- 漢字・カタカナは受理しない
- `ATP` と `atp` は同じ
- 表示用カタカナ正解をひらがな入力で当てられる

進行:

- 誰も押さない 5 秒のあと正解を 3 秒表示して次問
- 正解後 3 秒で次問
- 最終問題も 3 秒結果を経て gameOver
- 一人練習の誤答はロックアウトせず、全文と正解を 3 秒表示して問題終了
- 次問の前は必ず正解表示を経る

得点:

- 開始 0
- 正解で加算
- ペナルティ none / minus
- 先取で終了
- 競走は指定問数終了時に順位
- 同率を許す

選出:

- 1 ゲーム 100 問を超えない
- Phase 1 は重複なし

## UI テストの範囲

やる:

- `canBuzz === false` のときボタンが disabled
- answering 中に問題文ノードがない

やらない（Phase 1）:

- レーダーチャートの見た目
- ピクセル単位のレイアウト
- キーバインド設定画面

## E2E（smoke）

`pnpm test:e2e`（Playwright）。一時 PGlite で API / signaling / web を立てる。

- 一人練習 1 問: 開始 → 未回答タイムアウト → 終了
- 部屋 1 問: 2 ブラウザで作成/参加 → 開始 → 終了

時間は実時計。問数 1・文字送り fast で安定させる。ゲーム規則の網羅は `game-core` の単位テスト。

## 実行タイミング

実装後は次を通す。

- lint
- typecheck
- unit test
- build

E2E は `pnpm test:e2e`。単位テストの 4 コマンドとは別。
