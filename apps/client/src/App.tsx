import { useState } from "react";
import { authClient, useSession } from "./lib/authClient";
import { useClicks } from "./lib/useClicks";
import { AuthDialog } from "./components/AuthDialog";
import { CounterView } from "./components/CounterView";

type Tab = "counter" | "leaderboard";

export default function App() {
  const { data: session, isPending } = useSession();
  const { counts, session: sessionCount, click } = useClicks(
    session?.user.id ?? null,
  );
  const [tab, setTab] = useState<Tab>("counter");
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <span className="text-lg font-semibold tracking-tight">click.</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTab("leaderboard")}
              className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium hover:bg-neutral-50"
            >
              Leaderboard
            </button>
            {isPending ? null : session ? (
              <>
                <span className="hidden text-sm text-neutral-600 sm:inline">
                  {session.user.name}
                </span>
                <button
                  type="button"
                  onClick={() => authClient.signOut()}
                  className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium hover:bg-neutral-50"
                >
                  Sign out
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setAuthOpen(true)}
                className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium hover:bg-neutral-50"
              >
                Sign in
              </button>
            )}
          </div>
        </div>

        <nav className="mx-auto flex max-w-3xl gap-2 px-6 pb-3">
          <TabButton active={tab === "counter"} onClick={() => setTab("counter")}>
            Counter
          </TabButton>
          <TabButton
            active={tab === "leaderboard"}
            onClick={() => setTab("leaderboard")}
          >
            Leaderboard
          </TabButton>
        </nav>
      </header>

      <main className="mx-auto max-w-3xl px-6">
        {tab === "counter" ? (
          <CounterView counts={counts} session={sessionCount} onClick={click} />
        ) : (
          <div className="py-20 text-center text-neutral-500">
            Leaderboard coming soon.
          </div>
        )}
      </main>

      {authOpen && <AuthDialog onClose={() => setAuthOpen(false)} />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "border border-neutral-300 bg-white text-neutral-900"
          : "text-neutral-500 hover:text-neutral-900",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
