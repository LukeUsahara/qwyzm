# Phase 10

問題セット。カスタム部屋・WebRTC / 権威 WS・ユーザー投稿問題は対象外。

## 目的

「クイズ問題 → 問題セット → 一人練習 / カスタム対戦」を実体化する。`questionSetId` を出題ソースとして機能させ、ジャンル指定も同じ解決器に統一する。

## 含むもの

1. `question_sets` / `question_set_items` とマイグレーション `0004_question_sets`
2. `source = filter | manual`。可視性 `official`（読み取り、編集は admin）/ `private`（所有者）
3. ログインは PostgreSQL、ゲストは `qwyzm.questionSets.v1`。混ぜない。HTTP での作成はログイン必須
4. `null` の questionSetId はジャンル指定の暗黙 filter セットとして同じ `resolveQuestionSetIds` を通す
5. StartScreen のセット選択と、構造だけのセット管理画面
6. 出題は解決済みプールに対して `pickQuestions`（直近回避）だけを使う

## 含まないもの

- ユーザー投稿問題本体
- セットの共有・公開・複製
- WS / 部屋
- ゲストセットのアカウント移行

## 完了条件

- セットを作り一人練習の出題に使える
- ジャンル指定も同じ解決器
- 権限判定はサーバー側（client の ownerId を信じない）
- lint / typecheck / test / build が緑
