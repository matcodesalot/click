import type { ClickCounts } from "@click/shared";
import { ClickButton } from "./ClickButton";

type Props = {
  counts: ClickCounts;
  session: number;
  onClick: () => void;
};

const numberFormat = new Intl.NumberFormat("en-US");

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-neutral-100 px-4 py-3 text-center">
      <div className="text-xs font-medium text-neutral-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-neutral-900">{value}</div>
    </div>
  );
}

export function CounterView({ counts, session, onClick }: Props) {
  const userValue =
    counts.user === null ? "—" : numberFormat.format(counts.user);

  return (
    <div className="flex flex-col items-center gap-8 py-10">
      <div className="flex flex-col items-center gap-2">
        <div className="text-sm font-medium text-neutral-500">
          Global clicks
        </div>
        <div className="text-6xl font-bold tracking-tight text-neutral-900 tabular-nums sm:text-7xl">
          {numberFormat.format(counts.global)}
        </div>
      </div>

      <ClickButton onClick={onClick} />

      <p className="text-sm text-neutral-500">
        Click the button to contribute to the global count
      </p>

      <div className="grid w-full max-w-md grid-cols-3 gap-3">
        <Stat label="Your clicks (weekly)" value={userValue} />
        <Stat label="This session" value={numberFormat.format(session)} />
        <Stat label="Your clicks (all time)" value="—" />
      </div>
    </div>
  );
}
