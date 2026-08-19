# Phase 1 実装計画

2026-08-17 に仕様を確定し、実装を開始した。

## 目的

一人練習のゲームループを、規則は `game-core`、描画は `apps/web` に分けて動かす。

```text
第n問表示 → 1秒 → 1文字ずつ表示 → 早押し → 本文即消し
→ 回答 → 正解/不正解 → 結果3秒 → 次問 → 終了画面
```

## 含むもの

1. pnpm workspace の骨格
   - `package.json` / `pnpm-workspace.yaml` / `tsconfig.base.json`
   - `.gitignore` / `.npmrc`
   - ルート scripts: `lint` `typecheck` `test` `build`
2. `packages/shared`
   - 時間定数、人数・問数上限、難易度列挙
3. `packages/game-core`
   - FSM、intent、view、正規化、判定、得点、勝利
   - 偽時計による Vitest
4. `packages/validation`
   - 回答文字種など、core の純関数を Zod で包む最小セット
5. `packages/db`
   - Drizzle スキーマ定義のみ。マイグレーション実行は任意
6. `apps/web`
   - Vite + React + Tailwind
   - 左プロフィール枠（プレースホルダ）
   - 右ゲーム窓
   - 一人練習ループ
   - Space / ボタン早押し
   - 回答欄（IME 考慮、paste 禁止、英字小文字）
   - ゲージは deadline から計算。判定に `setInterval` を使わない
7. フィクスチャ問題（数問）。DB なしで起動できる
8. Docker Compose は PostgreSQL サービスだけ用意してよい。web の起動条件にはしない

## 含まないもの

- ログイン / Better Auth
- カスタムルーム対戦
- WebRTC / シグナリング本体
- ランダムマッチ
- フレンド
- レーダーの実データ
- ユーザー問題作成
- 読み上げ
- 難易度算出
- 出題戦略（未出題優先など）
- キーバインド設定 UI（定数で Space）
- 速度 3 段階 UI（定数 `normal` のみ。値は変更しやすい場所に置く）
- 誤答ルール 4 種の実装（一人用 `endQuestion` のみ。他は型）

## 実装順

1. リポジトリ骨格と lint / typecheck
2. shared 定数
3. game-core の型と正規化（テスト先）
4. game-core の FSM（テストと同時）
5. web の画面枠
6. web を engine に接続
7. フィクスチャで手動確認
8. lint / typecheck / unit test / build

## 完了条件

- フィクスチャ問題で一人練習ループが通る
- 回答中に問題文が出ない
- 早押し不可時にボタンが無効
- 時間判定がタイムスタンプベース
- game-core に状態遷移テストがある
- React コンポーネントに得点・勝者決定・文字送り規則がない
- lint / typecheck / test / build が通る

## 確定済み（実装に反映）

1. 入力はひらがな・英字・数字・長音のみ。カタカナ入力はバリデーションで拒否。表示用正解はカタカナ／漢字になり得る
2. 一人練習の誤答はロックアウトせず、全文と正解を 3 秒表示して問題終了
3. 全文表示後 5 秒は本文を出したまま早押し可
4. プレビュー 1 秒は早押し不可
5. 次の問題の前は、いかなる場合でも正解を表示する（誰も押さない場合も含む）
6. 端末間比較用の同期時計を game-core に実装する（一人ではオフセット 0）
