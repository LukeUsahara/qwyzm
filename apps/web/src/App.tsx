import { useEffect, useMemo, useState } from "react";
import type { GameEngine } from "@qwyzm/game-core";
import { summarizeProfile, questionsFromResolvedIds, resolveQuestionSetIds } from "@qwyzm/play-data";
import { isLocalQuestionSetId, type RuleSet } from "@qwyzm/shared";
import { createSoloEngine } from "./game/createSoloEngine.ts";
import { useGameView } from "./game/useGameView.ts";
import { usePlayHistory } from "./play-data/usePlayHistory.ts";
import { useSoloResult } from "./play-data/useSoloResult.ts";
import { createHttpQuestionRepository } from "./catalog/http-question-repository.ts";
import { useQuestionCatalog } from "./catalog/useQuestionCatalog.ts";
import { authClient } from "./auth/client.js";
import { useSession } from "./stores/session.ts";
import { useSettings } from "./stores/settings.ts";
import { PlayScreen } from "./components/play/PlayScreen.tsx";
import { LOCAL_PLAYER_ID } from "./game/ids.ts";
import { StartScreen } from "./components/play/StartScreen.tsx";
import { HistoryScreen } from "./components/history/HistoryScreen.tsx";
import { HomeScreen } from "./components/home/HomeScreen.tsx";
import { SettingsScreen } from "./components/settings/SettingsScreen.tsx";
import { QuestionSetsScreen } from "./components/sets/QuestionSetsScreen.tsx";
import { RoomScreen } from "./components/rooms/RoomScreen.tsx";
import { ProfilePanel } from "./components/profile/ProfilePanel.tsx";
import { AdminCatalogScreen } from "./components/admin/AdminCatalogScreen.tsx";
import { useQuestionSets } from "./play-data/useQuestionSets.ts";

type ActivePlay = {
  engine: GameEngine;
  gameId: string;
  startedAt: string;
};

type MainView = "home" | "solo" | "play" | "history" | "settings" | "sets" | "room" | "admin";

export function App() {
  const { data: session, isPending } = authClient.useSession();
  const userId = useSession((s) => s.userId);
  const displayName = useSession((s) => s.displayName);
  const handle = useSession((s) => s.handle);
  const role = useSession((s) => s.role);
  const questionCount = useSession((s) => s.questionCount);
  const genreFilter = useSession((s) => s.genreFilter);
  const questionSetId = useSession((s) => s.questionSetId);
  const showQuestionGenre = useSession((s) => s.showQuestionGenre);
  const revealSpeed = useSession((s) => s.revealSpeed);
  const wrongAnswerRule = useSession((s) => s.wrongAnswerRule);
  const maxRereads = useSession((s) => s.maxRereads);
  const missPenalty = useSession((s) => s.missPenalty);
  const winCondition = useSession((s) => s.winCondition);
  const correctPoints = useSession((s) => s.correctPoints);
  const missPoints = useSession((s) => s.missPoints);
  const targetPoints = useSession((s) => s.targetPoints);
  const setDisplayName = useSession((s) => s.setDisplayName);
  const setQuestionCount = useSession((s) => s.setQuestionCount);
  const setGenreFilter = useSession((s) => s.setGenreFilter);
  const setQuestionSetId = useSession((s) => s.setQuestionSetId);
  const setShowQuestionGenre = useSession((s) => s.setShowQuestionGenre);
  const setRevealSpeed = useSession((s) => s.setRevealSpeed);
  const setWrongAnswerRule = useSession((s) => s.setWrongAnswerRule);
  const setMissPenalty = useSession((s) => s.setMissPenalty);
  const setWinCondition = useSession((s) => s.setWinCondition);
  const applyRuleSet = useSession((s) => s.applyRuleSet);
  const setUser = useSession((s) => s.setUser);
  const setGuest = useSession((s) => s.setGuest);
  const settingsRuleSet = useSettings((s) => s.ruleSet);
  const settingsShowGenre = useSettings((s) => s.showQuestionGenre);
  const patchSettings = useSettings((s) => s.patch);
  const [play, setPlay] = useState<ActivePlay | null>(null);
  const [viewName, setViewName] = useState<MainView>("home");
  const [historyTick, setHistoryTick] = useState(0);
  const view = useGameView(play?.engine ?? null);
  const repo = useMemo(
    () => createHttpQuestionRepository({ baseUrl: "/api" }),
    [],
  );
  const catalog = useQuestionCatalog(repo);
  const questionSets = useQuestionSets(role);
  const selectedSet =
    questionSets.sets.find((set) => set.id === questionSetId) ?? null;
  const playPool = useMemo(
    () =>
      questionsFromResolvedIds(
        catalog.questions,
        resolveQuestionSetIds({
          set: selectedSet,
          genreFilter,
          catalog: catalog.questions,
          genres: catalog.genres,
        }),
      ),
    [catalog.genres, catalog.questions, genreFilter, selectedSet],
  );
  const selectedGenreIds = useMemo(
    () => (genreFilter.allMain ? [] : [...genreFilter.selectedGenreIds]),
    [genreFilter.allMain, genreFilter.selectedGenreIds],
  );
  const history = usePlayHistory(userId, historyTick);
  const recentQuestionIds = useMemo(
    () => history.games.flatMap((game) => game.attempts.map((attempt) => attempt.questionId)),
    [history.games],
  );
  const genreStats = useMemo(
    () => summarizeProfile(history.games, catalog.genres).byRootGenre,
    [history.games, catalog.genres],
  );
  const { analysis, saveError } = useSoloResult({
    gameId: play?.gameId ?? null,
    startedAt: play?.startedAt ?? null,
    selectedGenreIds,
    genres: catalog.genres,
    userId,
    view,
    onSaved: () => setHistoryTick((token) => token + 1),
  });

  const sessionRuleSet = useMemo<RuleSet>(
    () => ({
      questionCount,
      genreFilter,
      questionSetId,
      correctPoints,
      missPenalty,
      missPoints,
      winCondition,
      targetPoints,
      revealSpeed,
      wrongAnswerRule,
      maxRereads,
    }),
    [
      questionCount,
      genreFilter,
      questionSetId,
      correctPoints,
      missPenalty,
      missPoints,
      winCondition,
      targetPoints,
      revealSpeed,
      wrongAnswerRule,
      maxRereads,
    ],
  );

  useEffect(() => {
    applyRuleSet(settingsRuleSet);
    setShowQuestionGenre(settingsShowGenre);
    // Hydrate session from persisted settings once. Later copies happen in openSolo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isPending) {
      return;
    }
    if (session?.user) {
      const user = session.user as typeof session.user & {
        handle?: string;
        role?: "user" | "admin";
      };
      setUser({
        id: user.id,
        name: user.name,
        handle: user.handle && user.handle.length > 0 ? user.handle : "user",
        role: user.role === "admin" ? "admin" : "user",
      });
      return;
    }
    if (userId !== null) {
      setGuest();
      setViewName("home");
    }
  }, [isPending, session, setGuest, setUser, userId]);

  useEffect(() => {
    if (userId === null) {
      return;
    }
    if (
      settingsRuleSet.questionSetId !== null &&
      isLocalQuestionSetId(settingsRuleSet.questionSetId)
    ) {
      patchSettings({
        ruleSet: { ...settingsRuleSet, questionSetId: null },
      });
    }
  }, [userId, settingsRuleSet, patchSettings]);

  useEffect(() => {
    if (catalog.loading || questionSets.loading) {
      return;
    }
    if (
      questionSetId !== null &&
      questionSets.error === null &&
      !questionSets.sets.some((set) => set.id === questionSetId)
    ) {
      setQuestionSetId(null);
      return;
    }
    const next = Math.min(questionCount, Math.max(playPool.length, 1));
    if (next !== questionCount) {
      setQuestionCount(next);
    }
  }, [
    catalog.loading,
    playPool.length,
    questionCount,
    questionSetId,
    questionSets.error,
    questionSets.loading,
    questionSets.sets,
    setQuestionCount,
    setQuestionSetId,
  ]);

  const openHome = () => {
    setPlay(null);
    setViewName("home");
  };

  const openSolo = () => {
    applyRuleSet(settingsRuleSet);
    setShowQuestionGenre(settingsShowGenre);
    setPlay(null);
    setViewName("solo");
  };

  const openHistory = () => {
    setPlay(null);
    setViewName("history");
  };

  const openSettings = () => {
    setPlay(null);
    setViewName("settings");
  };

  const openSets = () => {
    setPlay(null);
    setViewName("sets");
  };

  const openRoom = () => {
    applyRuleSet(settingsRuleSet);
    setPlay(null);
    setViewName("room");
  };

  const chooseQuestionSet = (id: string | null) => {
    setQuestionSetId(id);
    patchSettings({
      ruleSet: { ...settingsRuleSet, questionSetId: id },
    });
  };

  return (
    <div className="flex h-full min-h-0">
      <ProfilePanel
        displayName={displayName}
        handle={handle}
        role={role}
        genreStats={genreStats}
        onOpenHome={openHome}
        onOpenHistory={openHistory}
        onOpenSettings={openSettings}
        onOpenSets={openSets}
        onOpenAdmin={
          role === "admin"
            ? () => {
                setPlay(null);
                setViewName("admin");
              }
            : undefined
        }
      />
      <main
        className={`min-w-0 flex-1 bg-ink ${
          viewName === "admin" && role === "admin" ? "px-6 py-6" : "px-10 py-8"
        }`}
      >
        {viewName === "admin" && role === "admin" ? (
          <AdminCatalogScreen
            genres={catalog.genres}
            onClose={openHome}
            onChanged={() => catalog.reload()}
          />
        ) : viewName === "history" ? (
          <HistoryScreen
            games={history.games}
            loading={history.loading}
            error={history.error}
            genres={catalog.genres}
            onClose={openHome}
          />
        ) : viewName === "settings" ? (
          <SettingsScreen onClose={openHome} />
        ) : viewName === "sets" ? (
          <QuestionSetsScreen
            role={role}
            userId={userId}
            sets={questionSets.sets}
            genres={catalog.genres}
            catalog={catalog.questions}
            loading={questionSets.loading}
            error={questionSets.error}
            onClose={openHome}
            onSave={questionSets.save}
            onRemove={questionSets.remove}
            createDraft={questionSets.createDraft}
          />
        ) : viewName === "room" ? (
          <RoomScreen
            displayName={displayName}
            ruleSet={sessionRuleSet}
            genres={catalog.genres}
            userId={userId}
            onClose={openHome}
            onSaved={() => setHistoryTick((token) => token + 1)}
          />
        ) : play && view ? (
          <PlayScreen
            playerId={LOCAL_PLAYER_ID}
            view={view}
            sendIntent={(intent) => play.engine.dispatch(LOCAL_PLAYER_ID, intent)}
            analysis={analysis}
            saveError={saveError}
            genres={catalog.genres}
            showQuestionGenre={showQuestionGenre}
            onExit={openHome}
          />
        ) : viewName === "solo" ? (
          catalog.loading && catalog.genres.length === 0 ? (
            <p className="text-sm text-muted">問題を読み込み中…</p>
          ) : catalog.error && catalog.genres.length === 0 ? (
            <p className="text-sm text-bad">{catalog.error}</p>
          ) : (
            <StartScreen
              displayName={displayName}
              questionCount={questionCount}
              genreFilter={genreFilter}
              questionSetId={questionSetId}
              questionSets={questionSets.sets}
              showQuestionGenre={showQuestionGenre}
              revealSpeed={revealSpeed}
              wrongAnswerRule={wrongAnswerRule}
              missPenalty={missPenalty}
              winCondition={winCondition}
              genres={catalog.genres}
              poolSize={playPool.length}
              busy={catalog.loading || questionSets.loading}
              authenticated={userId !== null}
              onDisplayName={setDisplayName}
              onQuestionCount={setQuestionCount}
              onGenreFilter={setGenreFilter}
              onQuestionSetId={chooseQuestionSet}
              onShowQuestionGenre={(value) => {
                setShowQuestionGenre(value);
                patchSettings({ showQuestionGenre: value });
              }}
              onRevealSpeed={setRevealSpeed}
              onWrongAnswerRule={setWrongAnswerRule}
              onMissPenalty={setMissPenalty}
              onWinCondition={setWinCondition}
              onBack={openHome}
              onStart={(count) => {
                setPlay({
                  engine: createSoloEngine({
                    displayName,
                    ruleSet: { ...sessionRuleSet, questionCount: count },
                    pool: playPool,
                    recentQuestionIds,
                  }),
                  gameId: crypto.randomUUID(),
                  startedAt: new Date().toISOString(),
                });
                setViewName("play");
              }}
            />
          )
        ) : (
          <HomeScreen
            onSolo={openSolo}
            onHistory={openHistory}
            onSettings={openSettings}
            onSets={openSets}
            onRoom={openRoom}
          />
        )}
      </main>
    </div>
  );
}
