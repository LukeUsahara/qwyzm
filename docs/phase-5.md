# Phase 5

認証を入れ、ログイン中の一人練習成績をユーザーに紐付けて PostgreSQL に保存する。カスタム部屋・WebRTC・OAuth・メール認証は対象外。

## 目的

「この成績は誰のものか」を確定する。問題ごとの押下位置は、ログイン中はその人の過去記録だけを見る。

## 含むもの

1. Better Auth（メール＋パスワード）+ Drizzle adapter
2. `handle` は登録時に一度だけ。以後変更不可
3. 表示名はアカウントの `name`
4. ログイン中のゲーム終了時に `games` / `game_players` / `game_questions` / `question_play_records` へ保存
5. 終了画面の分析はログイン中なら API の過去ゲームを使う
6. 未ログインは従来どおり localStorage。ゲスト履歴はアカウントへ混ぜない

## 含まないもの

- カスタム部屋 / WebRTC / フレンド
- OAuth
- メール認証・パスワード再設定メール
- 本格的な設定画面
- ゲスト成績の自動移行
- 全ユーザー横断の平均押下位置 API
- レーダーの実データ

## API

```
GET  /health
GET  /api/health
ALL  /api/auth/*
GET  /api/me
GET  /api/genres
GET  /api/questions
GET  /api/questions/:id
GET  /api/games
POST /api/games
```

Vite の `/api` プロキシはパスを書き換えない。Better Auth の `basePath` は `/api/auth`。

## 成績

`PlayRepository` を維持する。

- ゲスト: localStorage
- ログイン中: HTTP → Drizzle

押下位置は従来どおり `questionId` 単位。問題をまたいだ平均は出さない。
