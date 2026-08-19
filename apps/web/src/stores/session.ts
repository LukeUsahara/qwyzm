import {
  DEFAULT_GENRE_PLAY_FILTER,
  MAX_QUESTIONS_PER_GAME,
  MIN_QUESTIONS_PER_GAME,
  type GenrePlayFilter,
  type UserRole,
} from "@qwyzm/shared";
import { create } from "zustand";

type SessionState = {
  userId: string | null;
  displayName: string;
  handle: string;
  role: UserRole;
  questionCount: number;
  genreFilter: GenrePlayFilter;
  setDisplayName: (displayName: string) => void;
  setQuestionCount: (questionCount: number) => void;
  setGenreFilter: (genreFilter: GenrePlayFilter) => void;
  setUser: (user: { id: string; name: string; handle: string; role: UserRole }) => void;
  setGuest: () => void;
};

export const useSession = create<SessionState>((set) => ({
  userId: null,
  displayName: "ゲスト",
  handle: "guest",
  role: "guest",
  questionCount: 5,
  genreFilter: DEFAULT_GENRE_PLAY_FILTER,
  setDisplayName: (displayName) => set({ displayName }),
  setQuestionCount: (questionCount) =>
    set({
      questionCount: Math.min(
        MAX_QUESTIONS_PER_GAME,
        Math.max(MIN_QUESTIONS_PER_GAME, questionCount),
      ),
    }),
  setGenreFilter: (genreFilter) => set({ genreFilter }),
  setUser: (user) =>
    set({
      userId: user.id,
      displayName: user.name,
      handle: user.handle,
      role: user.role === "admin" ? "admin" : "user",
    }),
  setGuest: () =>
    set({
      userId: null,
      displayName: "ゲスト",
      handle: "guest",
      role: "guest",
    }),
}));
