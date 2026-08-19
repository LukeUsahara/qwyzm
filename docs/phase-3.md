# Phase 3

一人練習の主要ループ「練習 → 成績蓄積 → 成長確認」を完成形に近づける。対戦・認証・WebRTC は対象外。DB 移行もしない。

## 現状

- 出題は `apps/web/src/fixtures/` の配列
- `game-core` の `Question` はプレイに必要な最小項目のみ（id / 本文 / 正解 / 惜しい / genreIds）
- 1 ゲーム内の成績は `QuestionPlayRecord` としてメモリ上にあり、終了画面で見られる
- 終了後に消える。gameId はまだない

## 方針

```
game-core          プレイ規則。永続化を知らない
packages/play-data  カタログ型、保存DTO、集計、Repository インタフェース
apps/web storage    localStorage 実装。後で API 実装に差し替え
```

- `game-core` に localStorage / IndexedDB を置かない
- UI もストレージ API を直接叩かない。Repository 経由
- 保存形は将来の PostgreSQL テーブル（games / question_play_records）に寄せる

## 1. 問題データモデル

`QuestionCatalogItem` を play-data に置く。プレイ用 `Question` はその部分集合。

必須: 不変 UUID、本文、正解、惜しい、ジャンル ID（子ジャンル含む）

任意（今は null / 未設定でよい）:

- 出典
- 難易度
- 読み上げ
- 作成者・status

フィクスチャをこの型に合わせ、`toPlayQuestion()` で engine に渡す。ファイルは fixtures のまま。

## 2. 永続化

ブラウザは localStorage（JSON、バージョン付き）。IndexedDB はまだ使わない。5MB で十分で、テストしやすい。

`PlayRepository`:

- `listGames()`
- `saveGame(game)`（同一 gameId は上書き）
- `clear()`（テスト用）

保存単位はゲーム 1 本 + その attempts。attempt に `buzzCharIndex`（0 始まりの文字インデックス）を必ず含める。genreIds はその時点のスナップショット。

gameId は開始時に web 側で発行。engine は知らない。

## 3. 集計（純関数）

対象 attempts から（ゲーム全体・ジャンル別）:

- 正解数 / 不正解数 / 未解答数
- 正解率 = 正解 / 全問
- 平均回答時間（answerSubmitMs があるものだけ）

押下位置は問題をまたいで平均しない。問題文の長さが違うため、全体平均・ジャンル平均は出さない。

ジャンル別はトップレベルへ畳む。1 問が複数ジャンルならそれぞれに加算。

押下位置は `questionId` 単位。同じ問題の過去 attempts のうち `buzzCharIndex` があるものだけを平均し、今回の押下位置と比較する。別問題の値は混ぜない。

## 4. 成長比較

正解率・平均回答時間: 今終わったゲーム vs それより前の全ゲーム平均。比較できる条件: 過去ゲームが 1 本以上、かつその指標の標本が双方 1 件以上。足りなければ「まだ比較できるだけのデータがありません」。

押下位置: 問題単位。`過去平均 - 今回`（正ならより早い）。その問題の過去標本がなければ「この問題の平均データはまだありません」。

## 5. UI

終了画面を拡張するだけ。デザインの作り込みはしない。

- サマリ（正解率 / 正解数 / 不正解数 / 平均回答時間）
- 成長（正解率・回答時間。押下位置はここには出さない）
- ジャンル別（正解率 / 正解数 / 不正解数 / 平均回答時間）
- 問題別（正誤、正解、解答、押下時間、押下位置、回答時間、その問題の過去平均、平均より何文字早いか）

## テスト

play-data の Vitest:

- 保存・読み出し
- 正解率 / 平均回答時間
- ジャンル別
- 過去比較（正解率・回答時間）
- 問題単位の押下位置比較（別 questionId を混ぜない）
- 空データ / その問題の過去データなし
