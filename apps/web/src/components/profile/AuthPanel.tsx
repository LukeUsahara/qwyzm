import { useState, type FormEvent } from "react";
import { handleSchema } from "@qwyzm/validation";
import { authClient } from "../../auth/client.js";

type Mode = "login" | "signup";

type Props = {
  locked?: boolean;
};

export function AuthPanel({ locked = false }: Props) {
  const { data: session, isPending } = authClient.useSession();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (isPending) {
    return <p className="text-sm text-muted">アカウントを確認中…</p>;
  }

  if (session?.user) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-muted">{session.user.email}</p>
        <button
          type="button"
          className="border border-line px-3 py-1.5 text-xs tracking-widest text-muted disabled:opacity-40"
          disabled={locked}
          onClick={() => void authClient.signOut()}
        >
          ログアウト
        </button>
      </div>
    );
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "login") {
        const result = await authClient.signIn.email({ email, password });
        if (result.error) {
          setError(result.error.message ?? "ログインできませんでした");
        }
        return;
      }
      const parsedHandle = handleSchema.safeParse(handle);
      if (!parsedHandle.success) {
        setError("ID は3〜16文字の英数字と _ です");
        return;
      }
      const result = await authClient.signUp.email({
        email,
        password,
        name,
        handle: parsedHandle.data,
      });
      if (result.error) {
        setError(result.error.message ?? "登録できませんでした");
      }
    } catch {
      setError("通信に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="space-y-3">
      {locked ? (
        <p className="text-[11px] text-muted">試合中はアカウントを切り替えられません</p>
      ) : null}
      <fieldset disabled={locked} className="space-y-3 disabled:opacity-40">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`text-[11px] tracking-widest ${mode === "login" ? "text-gold" : "text-muted"}`}
        >
          ログイン
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`text-[11px] tracking-widest ${mode === "signup" ? "text-gold" : "text-muted"}`}
        >
          登録
        </button>
      </div>
      {mode === "signup" ? (
        <>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="表示名"
            className="w-full border-b border-line bg-transparent py-1 text-sm outline-none"
            required
          />
          <input
            value={handle}
            onChange={(event) => setHandle(event.target.value)}
            placeholder="ID（変更できません）"
            className="w-full border-b border-line bg-transparent py-1 text-sm outline-none"
            required
          />
        </>
      ) : null}
      <input
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="メール"
        className="w-full border-b border-line bg-transparent py-1 text-sm outline-none"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="パスワード"
        minLength={8}
        className="w-full border-b border-line bg-transparent py-1 text-sm outline-none"
        required
      />
      {error ? <p className="text-xs text-bad">{error}</p> : null}
      <button
        type="submit"
        disabled={busy || locked}
        className="border border-gold px-3 py-1.5 text-xs tracking-widest text-gold disabled:opacity-50"
      >
        {mode === "login" ? "ログイン" : "登録する"}
      </button>
      </fieldset>
    </form>
  );
}
