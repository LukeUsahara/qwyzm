import {
  IMPLEMENTED_WRONG_ANSWER_RULES,
  MISS_PENALTIES,
  MISS_PENALTY_LABEL,
  REVEAL_SPEEDS,
  REVEAL_SPEED_LABEL,
  WIN_CONDITIONS,
  WIN_CONDITION_LABEL,
  WRONG_ANSWER_RULE_LABEL,
  isAllowedBuzzCode,
  labelForKeyCode,
  type ImplementedWrongAnswerRule,
  type MissPenaltySetting,
  type RevealSpeed,
  type WinConditionSetting,
} from "@qwyzm/shared";
import { useEffect, useState } from "react";
import { useSettings } from "../../stores/settings.ts";

type Props = {
  onClose: () => void;
};

export function SettingsScreen({ onClose }: Props) {
  const settings = useSettings();
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    if (!capturing) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (!isAllowedBuzzCode(event.code)) {
        setCapturing(false);
        return;
      }
      settings.patch({ keyBind: { buzzCode: event.code } });
      setCapturing(false);
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [capturing, settings]);

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-8">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] tracking-[0.4em] text-gold">SETTINGS</p>
          <h1 className="mt-2 font-serif text-4xl text-paper">設定</h1>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="border border-line px-3 py-1.5 text-xs tracking-widest text-paper"
        >
          戻る
        </button>
      </div>

      <section className="space-y-3">
        <h2 className="text-[11px] tracking-widest text-muted">操作</h2>
        <p className="text-sm text-paper">
          早押しキー{" "}
          <span className="text-gold">{labelForKeyCode(settings.keyBind.buzzCode)}</span>
        </p>
        <button
          type="button"
          onClick={() => setCapturing(true)}
          className="border border-line px-3 py-1.5 text-xs tracking-widest text-paper"
        >
          {capturing ? "次に押したキーを割り当てます" : "キーを変更"}
        </button>
      </section>

      <label className="block space-y-2">
        <span className="text-[11px] tracking-widest text-muted">文字送り（既定）</span>
        <select
          value={settings.ruleSet.revealSpeed}
          onChange={(event) =>
            settings.patchRuleSet({
              revealSpeed: event.target.value as RevealSpeed,
            })
          }
          className="w-full border-b border-line bg-transparent py-2 text-lg outline-none"
        >
          {REVEAL_SPEEDS.map((speed) => (
            <option key={speed} value={speed} className="bg-panel text-paper">
              {REVEAL_SPEED_LABEL[speed]}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-2">
        <span className="text-[11px] tracking-widest text-muted">読み直し回数上限（既定）</span>
        <input
          type="number"
          min={0}
          max={10}
          value={settings.ruleSet.maxRereads}
          onChange={(event) =>
            settings.patchRuleSet({
              maxRereads: Math.max(0, Math.min(10, Number(event.target.value) || 0)),
            })
          }
          className="w-full border-b border-line bg-transparent py-2 text-lg outline-none"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-[11px] tracking-widest text-muted">誤答ルール（既定）</span>
        <select
          value={settings.ruleSet.wrongAnswerRule}
          onChange={(event) =>
            settings.patchRuleSet({
              wrongAnswerRule: event.target.value as ImplementedWrongAnswerRule,
            })
          }
          className="w-full border-b border-line bg-transparent py-2 text-lg outline-none"
        >
          {IMPLEMENTED_WRONG_ANSWER_RULES.map((rule) => (
            <option key={rule} value={rule} className="bg-panel text-paper">
              {WRONG_ANSWER_RULE_LABEL[rule]}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-2">
        <span className="text-[11px] tracking-widest text-muted">勝利条件（既定）</span>
        <select
          value={settings.ruleSet.winCondition}
          onChange={(event) =>
            settings.patchRuleSet({
              winCondition: event.target.value as WinConditionSetting,
            })
          }
          className="w-full border-b border-line bg-transparent py-2 text-lg outline-none"
        >
          {WIN_CONDITIONS.map((condition) => (
            <option key={condition} value={condition} className="bg-panel text-paper">
              {WIN_CONDITION_LABEL[condition]}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-2">
        <span className="text-[11px] tracking-widest text-muted">誤答ペナルティ（既定）</span>
        <select
          value={settings.ruleSet.missPenalty}
          onChange={(event) =>
            settings.patchRuleSet({
              missPenalty: event.target.value as MissPenaltySetting,
            })
          }
          className="w-full border-b border-line bg-transparent py-2 text-lg outline-none"
        >
          {MISS_PENALTIES.map((penalty) => (
            <option key={penalty} value={penalty} className="bg-panel text-paper">
              {MISS_PENALTY_LABEL[penalty]}
            </option>
          ))}
        </select>
      </label>

      <section className="space-y-4">
        <h2 className="text-[11px] tracking-widest text-muted">音量（SE は未実装。値だけ保持します）</h2>
        <VolumeSlider
          label="マスター"
          value={settings.volume.master}
          onChange={(master) =>
            settings.patch({ volume: { ...settings.volume, master } })
          }
        />
        <VolumeSlider
          label="BGM"
          value={settings.volume.bgm}
          onChange={(bgm) =>
            settings.patch({ volume: { ...settings.volume, bgm } })
          }
        />
        <VolumeSlider
          label="SE"
          value={settings.volume.se}
          onChange={(se) =>
            settings.patch({ volume: { ...settings.volume, se } })
          }
        />
      </section>
    </div>
  );
}

function VolumeSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block space-y-2">
      <span className="flex justify-between text-[11px] tracking-widest text-muted">
        <span>{label}</span>
        <span>{value}</span>
      </span>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full"
      />
    </label>
  );
}
