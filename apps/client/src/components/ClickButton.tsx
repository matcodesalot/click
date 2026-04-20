import { useRef, useState } from "react";
import { Pointer } from "lucide-react";

type Props = {
  onClick: () => void;
};

type Pop = { id: number; x: number };

export function ClickButton({ onClick }: Props) {
  const [pressed, setPressed] = useState(false);
  const [pops, setPops] = useState<Pop[]>([]);
  const popIdRef = useRef(0);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const id = ++popIdRef.current;
    setPops((p) => [...p, { id, x }]);
    setTimeout(() => {
      setPops((p) => p.filter((pop) => pop.id !== id));
    }, 700);
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        aria-label="Click to contribute"
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => setPressed(false)}
        onPointerLeave={() => setPressed(false)}
        onClick={handleClick}
        className={[
          "relative h-36 w-36 rounded-2xl border-2 border-violet-300 bg-white",
          "shadow-[0_0_0_6px_rgba(139,92,246,0.08)]",
          "transition-all duration-75 ease-out select-none",
          "hover:border-violet-400 hover:shadow-[0_0_0_8px_rgba(139,92,246,0.12)]",
          "active:scale-95",
          "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-300",
          pressed ? "translate-y-0.5" : "",
        ].join(" ")}
      >
        <Pointer
          aria-hidden="true"
          strokeWidth={1.75}
          className="mx-auto h-8 w-8 text-neutral-400"
        />
      </button>

      <div className="pointer-events-none absolute inset-x-0 top-0">
        {pops.map((p) => (
          <span
            key={p.id}
            className="absolute -translate-x-1/2 text-sm font-semibold text-violet-500 animate-clickpop"
            style={{ left: p.x }}
          >
            +1
          </span>
        ))}
      </div>
    </div>
  );
}
