import { useState } from "react";
import { LoginSchema, RegisterSchema } from "@click/shared";
import { authClient } from "../lib/authClient";
import { X } from "lucide-react";

type Props = {
  onClose: () => void;
};

export function AuthDialog({ onClose }: Props) {
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "signIn") {
        const parsed = LoginSchema.safeParse({ email, password });
        if (!parsed.success) {
          setError(parsed.error.issues[0]?.message ?? "Invalid input");
          return;
        }
        const res = await authClient.signIn.email(parsed.data);
        if (res.error) setError(res.error.message ?? "Sign-in failed");
        else onClose();
      } else {
        const parsed = RegisterSchema.safeParse({ name, email, password });
        if (!parsed.success) {
          setError(parsed.error.issues[0]?.message ?? "Invalid input");
          return;
        }
        const res = await authClient.signUp.email(parsed.data);
        if (res.error) setError(res.error.message ?? "Sign-up failed");
        else onClose();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-neutral-900">
            {mode === "signIn" ? "Sign in" : "Create account"}
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          {mode === "signUp" && (
            <input
              className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-violet-400 focus:bg-white"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              autoComplete="name"
            />
          )}
          <input
            className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-violet-400 focus:bg-white"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            autoComplete="email"
          />
          <input
            className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-violet-400 focus:bg-white"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete={mode === "signIn" ? "current-password" : "new-password"}
          />
          <button
            type="submit"
            disabled={submitting}
            className="mt-1 rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
          >
            {submitting
              ? "Please wait…"
              : mode === "signIn"
                ? "Sign in"
                : "Sign up"}
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="button"
            className="text-sm text-neutral-500 hover:text-neutral-800"
            onClick={() => {
              setMode(mode === "signIn" ? "signUp" : "signIn");
              setError(null);
            }}
          >
            {mode === "signIn"
              ? "Need an account? Sign up"
              : "Have an account? Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
