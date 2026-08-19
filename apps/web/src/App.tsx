import { useEffect, useMemo, useState } from "react";
import type { GameEngine } from "@qwyzm/game-core";
import { createSoloEngine } from "./game/createSoloEngine.ts";
import { useGameView } from "./game/useGameView.ts";
import { useSoloResult } from "./play-data/useSoloResult.ts";
import { createHttpQuestionRepository } from "./catalog/http-question-repository.ts";
import { useQuestionCatalog } from "./catalog/useQuestionCatalog.ts";
import { authClient } from "./auth/client.js";
import { useSession } from "./stores/session.ts";
import { PlayScreen } from "./components/play/PlayScreen.tsx";
import { StartScreen } from "./components/play/StartScreen.tsx";
import { ProfilePanel } from "./components/profile/ProfilePanel.tsx";
import { AdminCatalogScreen } from "./components/admin/AdminCatalogScreen.tsx";

type ActivePlay = {
  engine: GameEngine;
  gameId: string;
  startedAt: string;
};

export function App() {
  const { data: session, isPending } = authClient.useSession();
  const userId = useSession((s) => s.userId);
  const displayName = useSession((s) => s.displayName);
  const handle = useSession((s) => s.handle);
  const role = useSession((s) => s.role);
  const questionCount = useSession((s) => s.questionCount);
  const genreFilter = useSession((s) => s.genreFilter);
  const setDisplayName = useSession((s) => s.setDisplayName);
  const setQuestionCount = useSession((s) => s.setQuestionCount);
  const setGenreFilter = useSession((s) => s.setGenreFilter);
  const setUser = useSession((s) => s.setUser);
  const setGuest = useSession((s) => s.setGuest);
  const [play, setPlay] = useState<ActivePlay | null>(null);
  const [adminOpen, setAdminOpen] = useState(false);
  const view = useGameView(play?.engine ?? null);
  const repo = useMemo(
    () => createHttpQuestionRepository({ baseUrl: "/api" }),
    [],
  );
  const catalog = useQuestionCatalog(repo, genreFilter);
  const selectedGenreIds = useMemo(
    () => (genreFilter.allMain ? [] : [...genreFilter.selectedGenreIds]),
    [genreFilter.allMain, genreFilter.selectedGenreIds],
  );
  const analysis = useSoloResult({
    gameId: play?.gameId ?? null,
    startedAt: play?.startedAt ?? null,
    selectedGenreIds,
    genres: catalog.genres,
    userId,
    view,
  });

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
      setAdminOpen(false);
    }
  }, [isPending, session, setGuest, setUser, userId]);

  useEffect(() => {
    if (catalog.loading) {
      return;
    }
    const next = Math.min(questionCount, Math.max(catalog.questions.length, 1));
    if (next !== questionCount) {
      setQuestionCount(next);
    }
  }, [
    catalog.loading,
    catalog.questions.length,
    questionCount,
    setQuestionCount,
  ]);

  return (
    <div className="flex h-full min-h-0">
      <ProfilePanel
        displayName={displayName}
        handle={handle}
        role={role}
        onOpenAdmin={
          role === "admin"
            ? () => {
                setPlay(null);
                setAdminOpen(true);
              }
            : undefined
        }
      />
      <main
        className={`min-w-0 flex-1 bg-ink ${
          adminOpen && role === "admin" ? "px-6 py-6" : "px-10 py-8"
        }`}
      >
        {adminOpen && role === "admin" ? (
          <AdminCatalogScreen
            genres={catalog.genres}
            onClose={() => setAdminOpen(false)}
            onChanged={() => catalog.reload()}
          />
        ) : play && view ? (
          <PlayScreen
            engine={play.engine}
            view={view}
            analysis={analysis}
            genres={catalog.genres}
            onExit={() => setPlay(null)}
          />
        ) : catalog.loading && catalog.genres.length === 0 ? (
          <p className="text-sm text-muted">問題を読み込み中…</p>
        ) : catalog.error && catalog.genres.length === 0 ? (
          <p className="text-sm text-bad">{catalog.error}</p>
        ) : (
          <StartScreen
            displayName={displayName}
            questionCount={questionCount}
            genreFilter={genreFilter}
            genres={catalog.genres}
            poolSize={catalog.questions.length}
            busy={catalog.loading}
            authenticated={userId !== null}
            onDisplayName={setDisplayName}
            onQuestionCount={setQuestionCount}
            onGenreFilter={setGenreFilter}
            onStart={(count) =>
              setPlay({
                engine: createSoloEngine({
                  displayName,
                  questionCount: count,
                  pool: catalog.questions,
                  genres: catalog.genres,
                  genreFilter,
                }),
                gameId: crypto.randomUUID(),
                startedAt: new Date().toISOString(),
              })
            }
          />
        )}
      </main>
    </div>
  );
}
