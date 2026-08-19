type Props = {
  enabled: boolean;
  onBuzz: () => void;
};

export function BuzzButton({ enabled, onBuzz }: Props) {
  return (
    <button
      type="button"
      disabled={!enabled}
      onClick={onBuzz}
      className="mx-auto flex h-28 w-28 items-center justify-center rounded-full border-4 border-buzz-dark bg-buzz text-lg font-semibold tracking-widest text-paper disabled:border-line disabled:bg-panel-2 disabled:text-muted"
    >
      早押し
    </button>
  );
}
