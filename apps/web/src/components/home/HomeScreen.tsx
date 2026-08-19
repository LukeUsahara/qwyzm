type Props = {
  onSolo: () => void;
  onHistory: () => void;
  onSettings: () => void;
  onSets: () => void;
};

export function HomeScreen({ onSolo, onHistory, onSettings, onSets }: Props) {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-8">
      <div>
        <p className="text-[11px] tracking-[0.4em] text-gold">QWYZM</p>
        <h1 className="mt-2 font-serif text-4xl text-paper">ホーム</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          早押しの練習と分析が本体です。同じ規則で、あとから部屋対戦もつながります。
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={onSolo}
          className="border border-gold px-8 py-4 text-left"
        >
          <p className="text-sm tracking-[0.3em] text-gold">一人で早押し</p>
          <p className="mt-1 text-xs text-muted">ジャンルまたは問題セットで練習する</p>
        </button>
        <button
          type="button"
          onClick={onSets}
          className="border border-line px-8 py-4 text-left"
        >
          <p className="text-sm tracking-[0.3em] text-paper">問題セット</p>
          <p className="mt-1 text-xs text-muted">ジャンル指定や手選びの出題源</p>
        </button>
        <button
          type="button"
          disabled
          className="border border-line px-8 py-4 text-left opacity-50"
        >
          <p className="text-sm tracking-[0.3em] text-muted">カスタム部屋</p>
          <p className="mt-1 text-xs text-muted">Phase 11 で実装します</p>
        </button>
        <button
          type="button"
          onClick={onHistory}
          className="border border-line px-8 py-4 text-left"
        >
          <p className="text-sm tracking-[0.3em] text-paper">履歴</p>
          <p className="mt-1 text-xs text-muted">過去の練習を見返す</p>
        </button>
        <button
          type="button"
          onClick={onSettings}
          className="border border-line px-8 py-4 text-left"
        >
          <p className="text-sm tracking-[0.3em] text-paper">設定</p>
          <p className="mt-1 text-xs text-muted">キー、文字送り、音量</p>
        </button>
      </div>
    </div>
  );
}
