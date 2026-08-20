const ROOM_ERROR_MESSAGES: Record<string, string> = {
  not_enough_players: "2人以上そろってから開始できます",
  not_found: "部屋が見つかりません",
  already_in_room: "すでに部屋に入っています",
  room_full: "部屋がいっぱいです",
  match_in_progress: "試合中の部屋には入れません",
  not_joinable: "この部屋には入れません",
  not_lobby: "ロビー以外では操作できません",
  invalid_rules: "ルールが正しくありません",
  forbidden: "ホストだけができます",
  not_in_room: "部屋に入っていません",
  questions_unavailable: "問題を用意できませんでした",
  rate_limited: "操作が多すぎます",
  invalid_json: "通信データを読めませんでした",
  invalid_message: "不正な操作です",
};

export function roomErrorMessage(code: string): string {
  return ROOM_ERROR_MESSAGES[code] ?? "部屋の操作に失敗しました";
}
