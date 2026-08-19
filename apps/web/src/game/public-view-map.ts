import type { GameView, PublicGameView, QuestionPlayRecord } from "@qwyzm/game-core";

export function gameViewFromPublic(
  pub: PublicGameView,
  playRecords: QuestionPlayRecord[] = [],
): GameView {
  return {
    phase: pub.phase,
    questionIndex: pub.questionIndex,
    questionCount: pub.questionCount,
    questionId: pub.questionId,
    questionNumber: pub.questionNumber,
    genreIds: [...pub.genreIds],
    questionTextVisible: pub.questionTextVisible,
    visibleText: pub.visibleText,
    fullText: pub.revealedFullText,
    answerReveal: pub.correctAnswer,
    submittedAnswer: pub.submittedAnswer,
    canBuzz: pub.canBuzz,
    canAnswer: pub.canAnswer,
    answeringPlayerId: pub.answeringPlayerId,
    inputValue: pub.myAnswerInput,
    prompt: pub.prompt,
    gauges: pub.gauges.map((gauge) => ({ ...gauge })),
    players: pub.players.map((player) => ({
      id: player.id,
      displayName: player.displayName,
      seatIndex: player.seatIndex,
      score: player.score,
      rank: player.rank,
      withdrawn: player.withdrawn || player.connection === "withdrawn",
    })),
    buzzes: pub.buzzes.map((buzz) => ({ ...buzz })),
    outcome: pub.outcome,
    statusLabel: pub.statusLabel,
    lockedPlayerIds: [...pub.lockedPlayerIds],
    playRecords,
    readingStartedAt: pub.revealedAt,
  };
}
