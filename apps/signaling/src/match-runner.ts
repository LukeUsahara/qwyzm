import {
  GameEngine,
  createOffsetSyncedClock,
  nextWakeDelayMs,
  ruleSetToEngineSettings,
  toPublicGameView,
  type PlayerConnection,
  type PlayerIntent,
  type PublicGameView,
  type Question,
  type QuestionPlayRecord,
  type SyncedClock,
} from "@qwyzm/game-core";
import type { RuleSet } from "@qwyzm/shared";
import { clampBuzzTime } from "./time-guard.ts";

export type MatchEndReason = "completed" | "opponents_left";

export type MatchStanding = {
  id: string;
  displayName: string;
  score: number;
  rank: number;
};

type Scheduler = {
  setTimeout: (fn: () => void, ms: number) => unknown;
  clearTimeout: (id: unknown) => void;
};

const WITHDRAW_MS = 30_000;
const INPUT_DEBOUNCE_MS = 100;

export function createMatchRunner(params: {
  matchId: string;
  ruleSet: RuleSet;
  questions: Question[];
  players: { id: string; displayName: string; seatIndex: number }[];
  clock?: SyncedClock;
  scheduler?: Scheduler;
  emitState: (playerId: string, view: PublicGameView) => void;
  emitConnection: (playerId: string, connection: PlayerConnection) => void;
  onEnd: (payload: {
    reason: MatchEndReason;
    standings: MatchStanding[];
    records: QuestionPlayRecord[];
  }) => void;
}) {
  const clock =
    params.clock ??
    createOffsetSyncedClock(
      { now: () => Date.now() },
      0,
    );
  const scheduler: Scheduler = params.scheduler ?? {
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
  };
  const engine = new GameEngine(clock);
  engine.start({
    settings: {
      ...ruleSetToEngineSettings(params.ruleSet),
      questionCount: params.questions.length,
    },
    players: params.players,
    questions: params.questions,
  });

  const connections = new Map<string, PlayerConnection>(
    params.players.map((player) => [player.id, "connected"]),
  );
  const lastBuzzAt = new Map<string, number>();
  const pendingInput = new Map<string, string>();
  const inputTimers = new Map<string, unknown>();
  let version = 0;
  let lastJson = "";
  let timer: unknown = null;
  let ended = false;
  const withdrawTimers = new Map<string, unknown>();

  const connectionsRecord = (): Record<string, PlayerConnection> => {
    const record: Record<string, PlayerConnection> = {};
    for (const [id, value] of connections) {
      record[id] = value;
    }
    return record;
  };

  const connectedCount = () =>
    [...connections.values()].filter((value) => value === "connected").length;

  const standings = (): MatchStanding[] => {
    const view = engine.getView(clock.syncedNow());
    return view.players.map((player) => ({
      id: player.id,
      displayName: player.displayName,
      score: player.score,
      rank: player.rank,
    }));
  };

  const finish = (reason: MatchEndReason) => {
    if (ended) {
      return;
    }
    ended = true;
    if (timer !== null) {
      scheduler.clearTimeout(timer);
      timer = null;
    }
    for (const id of withdrawTimers.values()) {
      scheduler.clearTimeout(id);
    }
    withdrawTimers.clear();
    params.onEnd({
      reason,
      standings: standings(),
      records: engine.getView(clock.syncedNow()).playRecords,
    });
  };

  const dropPending = (playerId: string) => {
    const existing = inputTimers.get(playerId);
    if (existing !== undefined) {
      scheduler.clearTimeout(existing);
      inputTimers.delete(playerId);
    }
    pendingInput.delete(playerId);
  };

  const broadcast = (force = false) => {
    const now = clock.syncedNow();
    const view = engine.getView(now);
    version += 1;
    const encoded = JSON.stringify({
      phase: view.phase,
      questionIndex: view.questionIndex,
      scores: view.players.map((player) => [player.id, player.score]),
      answering: view.answeringPlayerId,
      visible: view.visibleText,
      connections: params.players.map((player) => [player.id, connections.get(player.id)]),
    });
    if (!force && encoded === lastJson) {
      version -= 1;
    } else {
      lastJson = encoded;
      for (const player of params.players) {
        params.emitState(
          player.id,
          toPublicGameView(view, {
            viewerId: player.id,
            matchId: params.matchId,
            version,
            now,
            connections: connectionsRecord(),
          }),
        );
      }
    }
    if (view.phase === "gameOver") {
      finish("completed");
      return;
    }
    const delay = nextWakeDelayMs(view);
    if (delay > 0 && !ended) {
      if (timer !== null) {
        scheduler.clearTimeout(timer);
      }
      timer = scheduler.setTimeout(() => {
        engine.tick(clock.syncedNow());
        broadcast();
      }, delay);
    }
  };

  const rejectIfUnavailable = (playerId: string): boolean => {
    const connection = connections.get(playerId);
    return connection !== "connected";
  };

  return {
    start() {
      broadcast();
    },
    tick() {
      engine.tick(clock.syncedNow());
      broadcast();
    },
    buzz(playerId: string, claimedAt: number, rttMs: number | null): string | null {
      if (ended || rejectIfUnavailable(playerId)) {
        return "buzz_rejected";
      }
      const now = clock.syncedNow();
      const view = engine.getView(now);
      if (!view.canBuzz || view.lockedPlayerIds.includes(playerId)) {
        return "buzz_rejected";
      }
      const effective = clampBuzzTime({
        claimedAt,
        serverNow: now,
        rttMs,
        revealedAt: view.readingStartedAt ?? 0,
        lastBuzzAt: lastBuzzAt.get(playerId) ?? null,
      });
      lastBuzzAt.set(playerId, effective);
      engine.dispatch(playerId, { type: "BUZZ" }, effective);
      broadcast();
      return null;
    },
    intent(playerId: string, intent: PlayerIntent, claimedAt: number): string | null {
      if (ended || rejectIfUnavailable(playerId)) {
        return "not_your_turn";
      }
      const now = clock.syncedNow();
      const view = engine.getView(now);
      if (intent.type !== "BUZZ" && view.answeringPlayerId !== playerId) {
        return "not_your_turn";
      }
      const effective = Math.min(Math.max(claimedAt, now - 330), now);
      if (intent.type === "ANSWER_INPUT") {
        pendingInput.set(playerId, intent.value);
        const existing = inputTimers.get(playerId);
        if (existing !== undefined) {
          scheduler.clearTimeout(existing);
        }
        inputTimers.set(
          playerId,
          scheduler.setTimeout(() => {
            const text = pendingInput.get(playerId);
            inputTimers.delete(playerId);
            if (text === undefined) {
              return;
            }
            pendingInput.delete(playerId);
            engine.dispatch(playerId, { type: "ANSWER_INPUT", value: text }, clock.syncedNow());
            broadcast();
          }, INPUT_DEBOUNCE_MS),
        );
        return null;
      }
      if (intent.type === "ANSWER_SUBMIT") {
        const existing = inputTimers.get(playerId);
        if (existing !== undefined) {
          scheduler.clearTimeout(existing);
          inputTimers.delete(playerId);
        }
        const text = pendingInput.get(playerId);
        pendingInput.delete(playerId);
        if (text !== undefined) {
          engine.dispatch(playerId, { type: "ANSWER_INPUT", value: text }, effective);
        }
      }
      engine.dispatch(playerId, intent, effective);
      broadcast();
      return null;
    },
    disconnect(playerId: string) {
      if (connections.get(playerId) !== "connected") {
        return;
      }
      dropPending(playerId);
      connections.set(playerId, "disconnected");
      params.emitConnection(playerId, "disconnected");
      const now = clock.syncedNow();
      const view = engine.getView(now);
      if (view.answeringPlayerId === playerId && view.phase === "answering") {
        engine.dispatch(playerId, { type: "ANSWER_INPUT", value: "" }, now);
        engine.dispatch(playerId, { type: "ANSWER_SUBMIT" }, now);
        const still = engine.getView(now);
        if (still.phase === "answering" && still.answeringPlayerId === playerId) {
          const gauge = still.gauges.find((item) => item.kind === "answerSubmit");
          engine.tick(now + (gauge?.remainingMs ?? 0) + 1);
        }
      }
      if (connectedCount() <= 1) {
        broadcast(true);
        finish("opponents_left");
        return;
      }
      const timerId = scheduler.setTimeout(() => {
        if (connections.get(playerId) === "disconnected") {
          connections.set(playerId, "withdrawn");
          params.emitConnection(playerId, "withdrawn");
          broadcast(true);
        }
      }, WITHDRAW_MS);
      withdrawTimers.set(playerId, timerId);
      broadcast(true);
    },
    resume(playerId: string) {
      const current = connections.get(playerId);
      if (current === "withdrawn" || ended) {
        return;
      }
      const timerId = withdrawTimers.get(playerId);
      if (timerId !== undefined) {
        scheduler.clearTimeout(timerId);
        withdrawTimers.delete(playerId);
      }
      connections.set(playerId, "connected");
      params.emitConnection(playerId, "connected");
      broadcast(true);
    },
    stop() {
      ended = true;
      if (timer !== null) {
        scheduler.clearTimeout(timer);
      }
    },
  };
}

export type MatchRunner = ReturnType<typeof createMatchRunner>;
