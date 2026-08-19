# Phase 12

サーバー権威の対戦ゲームループ。履歴統合は Phase 13。

## 目的

部屋の 2–4 人が同一 RuleSet で 1 試合を完走し、結果画面に到達する。得点・判定・出題はサーバーの `GameEngine` が正本。

## 確定仕様（Opus）

- 問題取得: API `POST /internal/play-questions`（`x-internal-token`）。signaling は DB を開かない
- 公開ビューは allow-list。reveal 前に `fullText` / 答えを送らない
- 押下時刻は RTT/2 クランプ + プレイヤー単調増加
- tick は `setTimeout` 起床のみ。時刻比較は `clock.now()`
- 切断: 枠維持、解答中なら即誤答、30 秒で withdrawn。残り 1 人なら試合終了
- PlayScreen を `playerId` + `sendIntent` で再利用
- start 時は接続中のみ参加。試合中 join 不可

## 補足

- ping の `t1 − t0` は時計ずれを含む。RTT 半値は 250ms で上限。新しい WS メッセージは足さない
- 解答入力待ち（`answeringWaitInput`）中の切断はエンジンの期限切れに任せる。入力中（`answering`）は即誤答
- reveal 前の `questionId` / `fullText` / 答えは送らない

## 含まないもの

遅延補償の作り込み、演出、対戦履歴の永続化、`/room/:code`、ランダムマッチ。
