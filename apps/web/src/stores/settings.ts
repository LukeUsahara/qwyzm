import {
  DEFAULT_USER_SETTINGS,
  USER_SETTINGS_STORAGE_KEY,
  type RuleSet,
  type UserSettings,
} from "@qwyzm/shared";
import { migrateSettings } from "@qwyzm/validation";
import { create } from "zustand";

function readSettings(): UserSettings {
  if (typeof localStorage === "undefined") {
    return DEFAULT_USER_SETTINGS;
  }
  try {
    const raw = localStorage.getItem(USER_SETTINGS_STORAGE_KEY);
    if (raw === null || raw.length === 0) {
      return DEFAULT_USER_SETTINGS;
    }
    return migrateSettings(JSON.parse(raw) as unknown);
  } catch {
    return DEFAULT_USER_SETTINGS;
  }
}

function persist(settings: UserSettings): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  localStorage.setItem(USER_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

type SettingsStore = UserSettings & {
  patch: (partial: Partial<UserSettings>) => void;
  patchRuleSet: (partial: Partial<RuleSet>) => void;
};

export const useSettings = create<SettingsStore>((set, get) => {
  const initial = readSettings();
  return {
    ...initial,
    patch: (partial) => {
      const { patch: _patch, patchRuleSet: _patchRuleSet, ...current } = get();
      const next: UserSettings = {
        ...current,
        ...partial,
        ruleSet: partial.ruleSet ?? current.ruleSet,
        keyBind: partial.keyBind ?? current.keyBind,
        volume: partial.volume ?? current.volume,
      };
      persist(next);
      set(next);
    },
    patchRuleSet: (partial) => {
      const { patch: _patch, patchRuleSet: _patchRuleSet, ...current } = get();
      const next: UserSettings = {
        ...current,
        ruleSet: { ...current.ruleSet, ...partial },
      };
      persist(next);
      set(next);
    },
  };
});
