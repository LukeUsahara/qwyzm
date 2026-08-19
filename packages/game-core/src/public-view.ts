import type { GameView, GaugeView } from "./types.ts";

export type PlayerConnection = "connected" | "disconnected" | "withdrawn";

export type PublicPlayerView = {
  id: string;
  displayName: string;
  seatIndex: number;
  score: number;
  rank: number;
  withdrawn: boolean;
  connection: PlayerConnection;
};

export type PublicGameView = {
  matchId: string;
  version: number;
  phase: GameView["phase"];
  questionIndex: number | null;
  questionCount: number;
  questionId: string | null;
  questionNumber: number | null;
  genreIds: string[];
  questionTextVisible: boolean;
  visibleText: string;
  revealedFullText: string | null;
  correctAnswer: string | null;
  submittedAnswer: string | null;
  canBuzz: boolean;
  canAnswer: boolean;
  answeringPlayerId: string | null;
  myAnswerInput: string;
  prompt: string | null;
  gauges: GaugeView[];
  players: PublicPlayerView[];
  buzzes: GameView["buzzes"];
  outcome: GameView["outcome"];
  statusLabel: string;
  lockedPlayerIds: string[];
  revealedAt: number | null;
  deadlineAt: number | null;
};

const REVEAL_PHASES = new Set<GameView["phase"]>(["showingResult", "gameOver"]);

export function toPublicGameView(
  view: GameView,
  params: {
    viewerId: string;
    matchId: string;
    version: number;
    now: number;
    connections: Readonly<Record<string, PlayerConnection>>;
  },
): PublicGameView {
  const reveal = REVEAL_PHASES.has(view.phase);
  const isAnswerer = view.answeringPlayerId === params.viewerId;
  const deadlineAt =
    view.gauges.length === 0
      ? null
      : params.now + Math.min(...view.gauges.map((gauge) => gauge.remainingMs));
  return {
    matchId: params.matchId,
    version: params.version,
    phase: view.phase,
    questionIndex: view.questionIndex,
    questionCount: view.questionCount,
    questionId: reveal ? view.questionId : null,
    questionNumber: view.questionNumber,
    genreIds: [...view.genreIds],
    questionTextVisible: view.questionTextVisible,
    visibleText: view.visibleText,
    revealedFullText: reveal ? view.fullText : null,
    correctAnswer: reveal ? view.answerReveal : null,
    submittedAnswer: reveal && isAnswerer ? view.submittedAnswer : null,
    canBuzz: view.canBuzz && !view.lockedPlayerIds.includes(params.viewerId),
    canAnswer: view.canAnswer && isAnswerer,
    answeringPlayerId: view.answeringPlayerId,
    myAnswerInput: isAnswerer ? view.inputValue : "",
    prompt: isAnswerer ? view.prompt : null,
    gauges: view.gauges.map((gauge) => ({ ...gauge })),
    players: view.players.map((player) => ({
      id: player.id,
      displayName: player.displayName,
      seatIndex: player.seatIndex,
      score: player.score,
      rank: player.rank,
      withdrawn: player.withdrawn,
      connection: params.connections[player.id] ?? "connected",
    })),
    buzzes: view.buzzes.map((buzz) => ({ ...buzz })),
    outcome: reveal ? view.outcome : null,
    statusLabel: view.statusLabel,
    lockedPlayerIds: [...view.lockedPlayerIds],
    revealedAt: view.readingStartedAt,
    deadlineAt,
  };
}

export function nextWakeDelayMs(view: GameView): number {
  if (view.phase === "gameOver" || view.phase === "idle") {
    return 0;
  }
  if (view.gauges.length === 0) {
    return 250;
  }
  const remaining = Math.min(...view.gauges.map((gauge) => gauge.remainingMs));
  return Math.min(250, Math.max(5, remaining));
}
