import { useState } from "react";
import { LoginSchema, RegisterSchema } from "@click/shared";
import { authClient, useSession } from "./lib/authClient";

export default function App() {
  const { data: session, isPending } = useSession();
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (isPending) return <p>Loading…</p>;

  if (session) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-green-600">Hello, {session.user.name}</h1>
        <button className="bg-green-600 text-white rounded-md p-2" onClick={() => authClient.signOut()}>Sign out</button>
      </div>
    );
  }

  const onSubmit: React.SubmitEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setError(null);

    if (mode === "signIn") {
      const parsed = LoginSchema.safeParse({ email, password });
      if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Invalid input");
      const res = await authClient.signIn.email(parsed.data);
      if (res.error) setError(res.error.message ?? "Sign-in failed");
    } else {
      const parsed = RegisterSchema.safeParse({ name, email, password });
      if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Invalid input");
      const res = await authClient.signUp.email(parsed.data);
      if (res.error) setError(res.error.message ?? "Sign-up failed");
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <h1 className="text-2xl font-bold text-green-600">{mode === "signIn" ? "Sign in" : "Create account"}</h1>
      {mode === "signUp" && (
        <input className="border border-gray-300 rounded-md p-2" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
      )}
      <input className="border border-gray-300 rounded-md p-2" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
      <input className="border border-gray-300 rounded-md p-2" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
      <button className="bg-green-600 text-white rounded-md p-2" type="submit">{mode === "signIn" ? "Sign in" : "Sign up"}</button>
      <button className="text-green-600" type="button" onClick={() => { setMode(mode === "signIn" ? "signUp" : "signIn"); setError(null); }}>
        {mode === "signIn" ? "Need an account? Sign up" : "Have an account? Sign in"}
      </button>
      {error && <p className="text-red-600">{error}</p>}
    </form>
  );
}