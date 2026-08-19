# Phase 13

対戦結果を一人練習と同じ履歴・分析に載せる。押下位置は questionId 単位のまま。

## 目的

`match_end` の `myRecords` と順位・得点を PlayRepository に保存し、履歴画面と成長分析が solo / 対戦を同じ配列で扱う。

## 確定仕様

- 保存の主体はクライアント。ソロと同じ `PlayRepository`（ゲストは localStorage、ログインは `POST /api/games`）。混ぜない
- `StoredGame.mode` は DB 既存 enum に合わせ `"solo" | "custom_room"`
- ゲーム id は `matchId`。ログイン同士は同じ行を upsert し、自分の `gamePlayers` / records だけ書き込む
- 得点・records はサーバー由来の `match_end` を schema 検証して保存する。クライアント申告の再判定はしない（ソロと同じ）
- 分析は既存の `analyzeSession` / `compareQuestionBuzz`。questionId 以外で buzz を平均しない
- records が空なら保存しない（途中終了で一度も解答していない場合）

## 含まないもの

演出、`/room/:code`、ランダムマッチ、フレンド、遅延補償、新しい WS メッセージ。
