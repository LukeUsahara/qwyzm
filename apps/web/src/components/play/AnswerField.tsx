import { filterAllowedInput } from "@qwyzm/game-core";
import { useEffect, useRef, useState, type FormEvent } from "react";

type Props = {
  enabled: boolean;
  value: string;
  prompt: string | null;
  onStart: () => void;
  onInput: (value: string) => void;
  onSubmit: () => void;
};

export function AnswerField({
  enabled,
  value,
  prompt,
  onStart,
  onInput,
  onSubmit,
}: Props) {
  const [draft, setDraft] = useState(value);
  const composing = useRef(false);
  const started = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!composing.current) {
      setDraft(value);
    }
  }, [value]);

  useEffect(() => {
    if (!enabled) {
      started.current = false;
    } else {
      inputRef.current?.focus();
    }
  }, [enabled]);

  const emitStart = () => {
    if (!started.current) {
      started.current = true;
      onStart();
    }
  };

  const handleSubmit = (event?: FormEvent) => {
    event?.preventDefault();
    if (composing.current) {
      return;
    }
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {prompt ? (
        <p className="text-center text-sm text-gold">{prompt}</p>
      ) : null}
      <input
        ref={inputRef}
        aria-label="回答"
        disabled={!enabled}
        value={draft}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        className="w-full rounded-sm border border-line bg-ink px-4 py-3 text-center text-xl tracking-widest text-paper outline-none disabled:opacity-40"
        placeholder={enabled ? "ひらがなで回答" : "早押し後に入力"}
        onPaste={(event) => event.preventDefault()}
        onDrop={(event) => event.preventDefault()}
        onCompositionStart={() => {
          composing.current = true;
          emitStart();
        }}
        onCompositionEnd={(event) => {
          composing.current = false;
          const next = filterAllowedInput(event.currentTarget.value);
          setDraft(next);
          if (next.length > 0) {
            emitStart();
            onInput(next);
          }
        }}
        onChange={(event) => {
          if (composing.current) {
            setDraft(event.currentTarget.value);
            return;
          }
          const next = filterAllowedInput(event.currentTarget.value);
          setDraft(next);
          if (next.length > 0) {
            emitStart();
          }
          onInput(next);
        }}
      />
      <p className="text-center text-[11px] text-muted">
        漢字・カタカナ不可 / コピー禁止 / Enterで確定
      </p>
    </form>
  );
}
