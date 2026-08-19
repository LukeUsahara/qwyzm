import {
  ANSWER_START_MS,
  ANSWER_SUBMIT_MS,
  CHARS_PER_SECOND,
  MAX_PLAYERS,
  MAX_QUESTIONS_PER_GAME,
  MIN_CORRECT_POINTS,
  MIN_MISS_POINTS,
  MIN_QUESTIONS_PER_GAME,
  NO_BUZZ_MS,
  PREVIEW_MS,
  RESULT_MS,
} from "@qwyzm/shared";
import type { SyncedClock } from "./clock.ts";
import { formatResultAnswer, isSecondClose, judgeAnswer } from "./judge.ts";
import { filterAllowedInput } from "./normalize.ts";
import { charsOf, visibleCharCount, visibleText } from "./reveal.ts";
import type {
  BuzzRecord,
  GamePhase,
  GameSettings,
  GameState,
  GameView,
  GaugeView,
  PlayerConfig,
  PlayerIntent,
  PlayerState,
  Question,
  QuestionPlayRecord,
  ResultOutcome,
} from "./types.ts";
import { SOLO_DEFAULT_SETTINGS } from "./types.ts";

export type StartGameInput = {
  settings: GameSettings;
  players: PlayerConfig[];
  questions: Question[];
};

const STATUS_LABEL: Record<GamePhase["type"], string> = {
  idle: "待機",
  preview: "第n問",
  reading: "出題中",
  waitingBuzz: "早押し待ち",
  answeringWaitInput: "入力待ち",
  answering: "回答中",
  showingResult: "結果",
  gameOver: "終了",
};

function initialState(): GameState {
  return {
    settings: SOLO_DEFAULT_SETTINGS,
    players: [],
    questions: [],
    phase: { type: "idle" },
    lockedPlayerIds: [],
    buzzes: [],
    playRecords: [],
    rereadCount: 0,
  };
}

function assertStartInput(input: StartGameInput): void {
  if (
    input.questions.length < MIN_QUESTIONS_PER_GAME ||
    input.questions.length > MAX_QUESTIONS_PER_GAME
  ) {
    throw new Error(
      `question count must be ${MIN_QUESTIONS_PER_GAME}..${MAX_QUESTIONS_PER_GAME}`,
    );
  }
  if (input.players.length < 1 || input.players.length > MAX_PLAYERS) {
    throw new Error(`player count must be 1..${MAX_PLAYERS}`);
  }
  if (input.settings.correctPoints < MIN_CORRECT_POINTS) {
    throw new Error("correctPoints must be >= 1");
  }
  if (
    input.settings.missPenalty === "minus_points" &&
    input.settings.missPoints < MIN_MISS_POINTS
  ) {
    throw new Error("missPoints must be >= 1");
  }
  const seats = new Set(input.players.map((player) => player.seatIndex));
  if (seats.size !== input.players.length) {
    throw new Error("seatIndex must be unique");
  }
}

function currentQuestion(
  state: GameState,
  index: number,
): Question {
  const question = state.questions[index];
  if (question === undefined) {
    throw new Error(`missing question at ${index}`);
  }
  return question;
}

function playerById(state: GameState, playerId: string): PlayerState | undefined {
  return state.players.find((player) => player.id === playerId);
}

function ranksFor(players: PlayerState[]): Map<string, number> {
  const sorted = [...players].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.seatIndex - b.seatIndex;
  });
  const ranks = new Map<string, number>();
  let lastScore: number | null = null;
  let lastRank = 0;
  let index = 0;
  for (const player of sorted) {
    index += 1;
    if (lastScore === null || player.score !== lastScore) {
      lastRank = index;
      lastScore = player.score;
    }
    ranks.set(player.id, lastRank);
  }
  return ranks;
}

function gauge(kind: GaugeView["kind"], remainingMs: number, totalMs: number): GaugeView {
  const clamped = Math.max(0, remainingMs);
  return {
    kind,
    remainingMs: clamped,
    totalMs,
    ratio: totalMs <= 0 ? 0 : Math.min(1, clamped / totalMs),
  };
}

function applyPenalty(state: GameState, playerId: string): void {
  if (state.settings.missPenalty !== "minus_points") {
    return;
  }
  const player = playerById(state, playerId);
  if (player === undefined) {
    return;
  }
  player.score -= state.settings.missPoints;
}

function applyCorrect(state: GameState, playerId: string): void {
  const player = playerById(state, playerId);
  if (player === undefined) {
    return;
  }
  player.score += state.settings.correctPoints;
}

function shouldEndAfterResult(state: GameState, questionIndex: number): boolean {
  if (state.settings.winCondition === "first_to_points") {
    return state.players.some(
      (player) => player.score >= state.settings.targetPoints,
    );
  }
  return questionIndex >= state.questions.length - 1;
}

function beginPreview(state: GameState, questionIndex: number, now: number): void {
  state.lockedPlayerIds = [];
  state.buzzes = [];
  state.rereadCount = 0;
  state.phase = {
    type: "preview",
    questionIndex,
    deadlineAt: now + PREVIEW_MS,
  };
}

function beginReading(state: GameState, questionIndex: number, now: number): void {
  state.phase = {
    type: "reading",
    questionIndex,
    readingStartedAt: now,
    segmentStartedAt: now,
    committedCount: 0,
    frozen: false,
  };
}

function readingVisibleCount(state: GameState, now: number): number {
  const phase = state.phase;
  if (phase.type !== "reading") {
    return 0;
  }
  if (phase.frozen) {
    return phase.committedCount;
  }
  const question = currentQuestion(state, phase.questionIndex);
  const charsPerSecond = CHARS_PER_SECOND[state.settings.revealSpeed];
  return visibleCharCount({
    length: charsOf(question.body).length,
    committedCount: phase.committedCount,
    segmentStartedAt: phase.segmentStartedAt,
    now,
    charsPerSecond,
  });
}

function enterShowingResult(
  state: GameState,
  params: {
    questionIndex: number;
    now: number;
    outcome: ResultOutcome;
    submitted: string | null;
    buzzAt: number | null;
    buzzCharIndex: number | null;
    playerId: string | null;
    closeCount: number;
    answerStartedAt: number | null;
    readingStartedAt: number | null;
  },
): void {
  const question = currentQuestion(state, params.questionIndex);
  const orderedBuzzes = compareBuzzes(state);
  const buzzIndex =
    params.playerId === null
      ? -1
      : orderedBuzzes.findIndex((buzz) => buzz.playerId === params.playerId);
  const record: QuestionPlayRecord = {
    questionId: question.id,
    questionIndex: params.questionIndex,
    questionBody: question.body,
    playerId: params.playerId,
    result: params.outcome,
    answerRaw: params.submitted,
    answerReveal: formatResultAnswer(question, params.submitted),
    buzzTimeMs:
      params.buzzAt !== null && params.readingStartedAt !== null
        ? params.buzzAt - params.readingStartedAt
        : null,
    buzzCharIndex: params.buzzCharIndex,
    buzzRank: buzzIndex >= 0 ? buzzIndex + 1 : null,
    answerStartMs:
      params.answerStartedAt !== null && params.buzzAt !== null
        ? params.answerStartedAt - params.buzzAt
        : null,
    answerSubmitMs:
      params.buzzAt !== null && params.outcome !== "unanswered"
        ? params.now - params.buzzAt
        : null,
    closeCount: params.closeCount,
    genreIds: [...question.genreIds],
  };
  state.playRecords = [...state.playRecords, record];
  state.phase = {
    type: "showingResult",
    questionIndex: params.questionIndex,
    deadlineAt: params.now + RESULT_MS,
    outcome: params.outcome,
    submitted: params.submitted,
    buzzAt: params.buzzAt,
    buzzCharIndex: params.buzzCharIndex,
  };
}

function unlockedOthers(state: GameState, exceptPlayerId: string): boolean {
  return state.players.some(
    (player) =>
      player.id !== exceptPlayerId &&
      !player.withdrawn &&
      !state.lockedPlayerIds.includes(player.id),
  );
}

function handleIncorrect(
  state: GameState,
  params: {
    playerId: string;
    questionIndex: number;
    now: number;
    submitted: string | null;
    buzzAt: number;
    buzzCharIndex: number;
    readingStartedAt: number;
    closeCount: number;
    answerStartedAt: number | null;
  },
): void {
  applyPenalty(state, params.playerId);
  if (!state.lockedPlayerIds.includes(params.playerId)) {
    state.lockedPlayerIds = [...state.lockedPlayerIds, params.playerId];
  }

  const endQuestion = (): void => {
    enterShowingResult(state, {
      questionIndex: params.questionIndex,
      now: params.now,
      outcome: "incorrect",
      submitted: params.submitted,
      buzzAt: params.buzzAt,
      buzzCharIndex: params.buzzCharIndex,
      playerId: params.playerId,
      closeCount: params.closeCount,
      answerStartedAt: params.answerStartedAt,
      readingStartedAt: params.readingStartedAt,
    });
  };

  const rule = state.settings.wrongAnswerRule;
  if (rule === "end_question" || !unlockedOthers(state, params.playerId)) {
    endQuestion();
    return;
  }

  if (rule === "resume_from_position") {
    state.phase = {
      type: "reading",
      questionIndex: params.questionIndex,
      readingStartedAt: params.readingStartedAt,
      segmentStartedAt: params.now,
      committedCount: params.buzzCharIndex,
      frozen: false,
    };
    return;
  }

  if (rule === "no_one_else") {
    state.phase = {
      type: "reading",
      questionIndex: params.questionIndex,
      readingStartedAt: params.readingStartedAt,
      segmentStartedAt: params.now,
      committedCount: params.buzzCharIndex,
      frozen: true,
    };
    return;
  }

  if (rule === "reread") {
    if (state.rereadCount >= state.settings.maxRereads) {
      endQuestion();
      return;
    }
    state.rereadCount += 1;
    beginReading(state, params.questionIndex, params.now);
    return;
  }

  const next = compareBuzzes(state).find(
    (buzz) =>
      buzz.playerId !== params.playerId &&
      !state.lockedPlayerIds.includes(buzz.playerId),
  );
  if (next === undefined) {
    endQuestion();
    return;
  }
  state.phase = {
    type: "answeringWaitInput",
    questionIndex: params.questionIndex,
    readingStartedAt: params.readingStartedAt,
    playerId: next.playerId,
    deadlineAt: params.now + ANSWER_START_MS,
    buzzAt: next.syncedAt,
    buzzCharIndex: next.charIndex,
  };
}

function compareBuzzes(state: GameState): BuzzRecord[] {
  const seat = new Map(
    state.players.map((player) => [player.id, player.seatIndex]),
  );
  return [...state.buzzes].sort((a, b) => {
    if (a.syncedAt !== b.syncedAt) {
      return a.syncedAt - b.syncedAt;
    }
    return (seat.get(a.playerId) ?? 0) - (seat.get(b.playerId) ?? 0);
  });
}

export class GameEngine {
  private state: GameState;

  constructor(private readonly clock: SyncedClock) {
    this.state = initialState();
  }

  getState(): GameState {
    return structuredClone(this.state);
  }

  start(input: StartGameInput): void {
    assertStartInput(input);
    this.state = {
      settings: { ...input.settings, questionCount: input.questions.length },
      players: input.players.map((player) => ({
        ...player,
        score: 0,
        withdrawn: false,
      })),
      questions: input.questions,
      phase: { type: "idle" },
      lockedPlayerIds: [],
      buzzes: [],
      playRecords: [],
      rereadCount: 0,
    };
    beginPreview(this.state, 0, this.clock.syncedNow());
  }

  tick(now = this.clock.syncedNow()): void {
    this.applyTime(now);
  }

  dispatch(playerId: string, intent: PlayerIntent, now = this.clock.syncedNow()): void {
    this.applyTime(now);
    switch (intent.type) {
      case "BUZZ":
        this.onBuzz(playerId, now);
        break;
      case "ANSWER_START":
        this.onAnswerStart(playerId, now);
        break;
      case "ANSWER_INPUT":
        this.onAnswerInput(playerId, intent.value, now);
        break;
      case "ANSWER_SUBMIT":
        this.onAnswerSubmit(playerId, now);
        break;
    }
  }

  getView(now = this.clock.syncedNow()): GameView {
    this.applyTime(now);
    return this.buildView(now);
  }

  private applyTime(now: number): void {
    const phase = this.state.phase;
    switch (phase.type) {
      case "idle":
      case "gameOver":
        return;
      case "preview":
        if (now >= phase.deadlineAt) {
          beginReading(this.state, phase.questionIndex, phase.deadlineAt);
          this.applyTime(now);
        }
        return;
      case "reading": {
        if (phase.frozen) {
          return;
        }
        const question = currentQuestion(this.state, phase.questionIndex);
        const length = charsOf(question.body).length;
        const charsPerSecond = CHARS_PER_SECOND[this.state.settings.revealSpeed];
        const remainingChars = Math.max(0, length - phase.committedCount);
        const revealEndAt =
          phase.segmentStartedAt + (remainingChars * 1000) / charsPerSecond;
        if (now >= revealEndAt) {
          this.state.phase = {
            type: "waitingBuzz",
            questionIndex: phase.questionIndex,
            readingStartedAt: phase.readingStartedAt,
            deadlineAt: revealEndAt + NO_BUZZ_MS,
          };
          this.applyTime(now);
        }
        return;
      }
      case "waitingBuzz":
        if (now >= phase.deadlineAt) {
          enterShowingResult(this.state, {
            questionIndex: phase.questionIndex,
            now,
            outcome: "unanswered",
            submitted: null,
            buzzAt: null,
            buzzCharIndex: null,
            playerId: null,
            closeCount: 0,
            answerStartedAt: null,
            readingStartedAt: phase.readingStartedAt,
          });
        }
        return;
      case "answeringWaitInput":
        if (now >= phase.deadlineAt) {
          handleIncorrect(this.state, {
            playerId: phase.playerId,
            questionIndex: phase.questionIndex,
            now,
            submitted: null,
            buzzAt: phase.buzzAt,
            buzzCharIndex: phase.buzzCharIndex,
            readingStartedAt: phase.readingStartedAt,
            closeCount: 0,
            answerStartedAt: null,
          });
        }
        return;
      case "answering":
        if (now >= phase.deadlineAt) {
          handleIncorrect(this.state, {
            playerId: phase.playerId,
            questionIndex: phase.questionIndex,
            now,
            submitted: phase.input,
            buzzAt: phase.buzzAt,
            buzzCharIndex: phase.buzzCharIndex,
            readingStartedAt: phase.readingStartedAt,
            closeCount: phase.closeCount,
            answerStartedAt: phase.answerStartedAt,
          });
        }
        return;
      case "showingResult":
        if (now >= phase.deadlineAt) {
          if (shouldEndAfterResult(this.state, phase.questionIndex)) {
            this.state.phase = { type: "gameOver" };
            return;
          }
          beginPreview(this.state, phase.questionIndex + 1, phase.deadlineAt);
          this.applyTime(now);
        }
        return;
    }
  }

  private onBuzz(playerId: string, now: number): void {
    const phase = this.state.phase;
    const player = playerById(this.state, playerId);
    if (player === undefined || player.withdrawn) {
      return;
    }
    if (this.state.lockedPlayerIds.includes(playerId)) {
      return;
    }
    if (this.state.buzzes.some((buzz) => buzz.playerId === playerId)) {
      if (phase.type === "answeringWaitInput" || phase.type === "answering") {
        return;
      }
    }

    if (
      (phase.type === "answeringWaitInput" || phase.type === "answering") &&
      this.state.settings.wrongAnswerRule === "next_fastest"
    ) {
      this.state.buzzes = [
        ...this.state.buzzes,
        {
          playerId,
          syncedAt: now,
          charIndex: phase.buzzCharIndex,
          timeFromReadingMs: now - phase.readingStartedAt,
        },
      ];
      return;
    }

    if (phase.type !== "reading" && phase.type !== "waitingBuzz") {
      return;
    }

    const question = currentQuestion(this.state, phase.questionIndex);
    const charIndex =
      phase.type === "reading"
        ? readingVisibleCount(this.state, now)
        : charsOf(question.body).length;
    const record: BuzzRecord = {
      playerId,
      syncedAt: now,
      charIndex,
      timeFromReadingMs: now - phase.readingStartedAt,
    };
    this.state.buzzes = [...this.state.buzzes, record];

    this.state.phase = {
      type: "answeringWaitInput",
      questionIndex: phase.questionIndex,
      readingStartedAt: phase.readingStartedAt,
      playerId,
      deadlineAt: now + ANSWER_START_MS,
      buzzAt: now,
      buzzCharIndex: charIndex,
    };
  }

  private onAnswerStart(playerId: string, now: number): void {
    const phase = this.state.phase;
    if (phase.type !== "answeringWaitInput" || phase.playerId !== playerId) {
      return;
    }
    this.state.phase = {
      type: "answering",
      questionIndex: phase.questionIndex,
      readingStartedAt: phase.readingStartedAt,
      playerId,
      deadlineAt: now + ANSWER_SUBMIT_MS,
      input: "",
      closeCount: 0,
      buzzAt: phase.buzzAt,
      buzzCharIndex: phase.buzzCharIndex,
      prompt: null,
      answerStartedAt: now,
    };
  }

  private onAnswerInput(playerId: string, raw: string, now: number): void {
    const filtered = filterAllowedInput(raw);
    const phase = this.state.phase;
    if (phase.type === "answeringWaitInput" && phase.playerId === playerId) {
      if (filtered.length === 0) {
        return;
      }
      this.state.phase = {
        type: "answering",
        questionIndex: phase.questionIndex,
        readingStartedAt: phase.readingStartedAt,
        playerId,
        deadlineAt: now + ANSWER_SUBMIT_MS,
        input: filtered,
        closeCount: 0,
        buzzAt: phase.buzzAt,
        buzzCharIndex: phase.buzzCharIndex,
        prompt: null,
        answerStartedAt: now,
      };
      return;
    }
    if (phase.type === "answering" && phase.playerId === playerId) {
      phase.input = filtered;
    }
  }

  private onAnswerSubmit(playerId: string, now: number): void {
    const phase = this.state.phase;
    if (phase.type !== "answering" || phase.playerId !== playerId) {
      return;
    }
    if (phase.input.length === 0) {
      return;
    }
    const question = currentQuestion(this.state, phase.questionIndex);
    const result = judgeAnswer(phase.input, question);
    if (result === "correct") {
      applyCorrect(this.state, playerId);
      enterShowingResult(this.state, {
        questionIndex: phase.questionIndex,
        now,
        outcome: "correct",
        submitted: phase.input,
        buzzAt: phase.buzzAt,
        buzzCharIndex: phase.buzzCharIndex,
        playerId,
        closeCount: phase.closeCount,
        answerStartedAt: phase.answerStartedAt,
        readingStartedAt: phase.readingStartedAt,
      });
      return;
    }
    if (result === "close") {
      if (isSecondClose(phase.closeCount)) {
        handleIncorrect(this.state, {
          playerId,
          questionIndex: phase.questionIndex,
          now,
          submitted: phase.input,
          buzzAt: phase.buzzAt,
          buzzCharIndex: phase.buzzCharIndex,
          readingStartedAt: phase.readingStartedAt,
          closeCount: phase.closeCount,
          answerStartedAt: phase.answerStartedAt,
        });
        return;
      }
      this.state.phase = {
        ...phase,
        input: "",
        closeCount: phase.closeCount + 1,
        deadlineAt: now + ANSWER_SUBMIT_MS,
        prompt: "言い直してください",
      };
      return;
    }
    handleIncorrect(this.state, {
      playerId,
      questionIndex: phase.questionIndex,
      now,
      submitted: phase.input,
      buzzAt: phase.buzzAt,
      buzzCharIndex: phase.buzzCharIndex,
      readingStartedAt: phase.readingStartedAt,
      closeCount: phase.closeCount,
      answerStartedAt: phase.answerStartedAt,
    });
  }

  private buildView(now: number): GameView {
    const { phase, players, questions } = this.state;
    const ranks = ranksFor(players);
    const playerViews = [...players]
      .sort((a, b) => a.seatIndex - b.seatIndex)
      .map((player) => ({
        id: player.id,
        displayName: player.displayName,
        seatIndex: player.seatIndex,
        score: player.score,
        rank: ranks.get(player.id) ?? players.length,
        withdrawn: player.withdrawn,
      }));

    const questionIndex =
      phase.type === "idle" || phase.type === "gameOver"
        ? null
        : phase.questionIndex;
    const question =
      questionIndex === null ? null : questions[questionIndex] ?? null;

    const buzzViews = compareBuzzes(this.state).map((buzz) => ({
      playerId: buzz.playerId,
      displayName: playerById(this.state, buzz.playerId)?.displayName ?? "",
      timeFromReadingMs: buzz.timeFromReadingMs,
      charIndex: buzz.charIndex,
    }));

    const base: GameView = {
      phase: phase.type,
      questionIndex,
      questionCount: questions.length,
      questionId: question?.id ?? null,
      questionNumber: questionIndex === null ? null : questionIndex + 1,
      genreIds: question ? [...question.genreIds] : [],
      questionTextVisible: false,
      visibleText: "",
      fullText: question?.body ?? null,
      answerReveal: null,
      submittedAnswer: null,
      canBuzz: false,
      canAnswer: false,
      answeringPlayerId: null,
      inputValue: "",
      prompt: null,
      gauges: [],
      players: playerViews,
      buzzes: buzzViews,
      outcome: null,
      statusLabel: STATUS_LABEL[phase.type],
      lockedPlayerIds: [...this.state.lockedPlayerIds],
      playRecords: this.state.playRecords,
      readingStartedAt: "readingStartedAt" in phase ? phase.readingStartedAt : null,
    };

    switch (phase.type) {
      case "idle":
        return { ...base, statusLabel: "待機" };
      case "gameOver":
        return { ...base, statusLabel: "終了" };
      case "preview":
        return {
          ...base,
          statusLabel: `第${phase.questionIndex + 1}問`,
        };
      case "reading": {
        const count = readingVisibleCount(this.state, now);
        return {
          ...base,
          questionTextVisible: true,
          visibleText: question ? visibleText(question.body, count) : "",
          canBuzz: true,
          statusLabel: phase.frozen
            ? "早押し待ち"
            : this.state.rereadCount > 0
              ? "読み直し"
              : "出題中",
        };
      }
      case "waitingBuzz":
        return {
          ...base,
          questionTextVisible: true,
          visibleText: question?.body ?? "",
          canBuzz: true,
          statusLabel: "早押し待ち",
          gauges: [gauge("noBuzz", phase.deadlineAt - now, NO_BUZZ_MS)],
        };
      case "answeringWaitInput":
        return {
          ...base,
          canAnswer: true,
          answeringPlayerId: phase.playerId,
          statusLabel: "入力待ち",
          gauges: [gauge("answerStart", phase.deadlineAt - now, ANSWER_START_MS)],
        };
      case "answering":
        return {
          ...base,
          canAnswer: true,
          answeringPlayerId: phase.playerId,
          inputValue: phase.input,
          prompt: phase.prompt,
          statusLabel: phase.prompt ?? "回答中",
          gauges: [
            gauge("answerSubmit", phase.deadlineAt - now, ANSWER_SUBMIT_MS),
          ],
        };
      case "showingResult":
        return {
          ...base,
          questionTextVisible: true,
          visibleText: question?.body ?? "",
          answerReveal: question
            ? formatResultAnswer(question, phase.submitted)
            : null,
          submittedAnswer: phase.submitted,
          outcome: phase.outcome,
          statusLabel:
            phase.outcome === "correct"
              ? "正解"
              : phase.outcome === "incorrect"
                ? "不正解"
                : "誰も押さず",
          gauges: [gauge("result", phase.deadlineAt - now, RESULT_MS)],
        };
    }
  }
}
