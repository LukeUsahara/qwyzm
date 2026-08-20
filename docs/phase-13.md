# Phase 13

対戦結果を一人練習と同じ履歴・分析に載せる。押下位置は questionId 単位のまま。

## 目的

`match_end` の `myRecords` と順位・得点を PlayRepository に保存し、履歴画面と成長分析が solo / match を同じ配列で扱う。

## 確定仕様

- 保存の主体はクライアント。ソロと同じ `PlayRepository`（ゲストは localStorage、ログインは `POST /api/games`）。混ぜない
- アプリの `StoredGame.mode` は `"solo" | "match"`。DB 既存 enum `custom_room` へ写像する（マイグレーションなし）
- ゲーム id は `matchId`。ログイン同士は同じ行を upsert し、自分の `gamePlayers` / records だけ書き込む（2 人とも履歴に残すため。所有権拒否だと後から保存した側が落ちる）
- 得点・records はサーバー由来の `match_end` を schema 検証して保存する。クライアント申告の再判定はしない（ソロと同じ）
- 分析は既存の `analyzeSession` / `compareQuestionBuzz`。questionId 以外で buzz を平均しない
- records が空なら保存しない
- 履歴行に `一人` / `対戦` の 1 行ラベルのみ

## 含まないもの

演出、`/room/:code`、ランダムマッチ、フレンド、遅延補償、新しい WS メッセージ、ランキング、相手の記録保存。
