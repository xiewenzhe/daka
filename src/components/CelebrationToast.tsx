"use client";

type CelebrationToastProps = {
  message: string;
  fireworks?: boolean;
  onClose: () => void;
};

const sparks = [
  ["-70px", "-74px", "#fb7185"],
  ["-28px", "-92px", "#f59e0b"],
  ["36px", "-88px", "#22c55e"],
  ["82px", "-56px", "#38bdf8"],
  ["92px", "2px", "#a78bfa"],
  ["66px", "64px", "#f97316"],
  ["8px", "88px", "#84cc16"],
  ["-52px", "72px", "#06b6d4"],
  ["-92px", "20px", "#e879f9"],
  ["-86px", "-34px", "#facc15"]
];

export function CelebrationToast({
  message,
  fireworks = false,
  onClose
}: CelebrationToastProps) {
  if (!message) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/20 px-5">
      <div className="relative w-full max-w-sm overflow-hidden rounded-lg bg-white p-6 text-center shadow-soft ring-1 ring-brand-100">
        {fireworks ? (
          <div className="pointer-events-none absolute inset-0">
            <span className="firework-core absolute left-1/2 top-16 h-4 w-4 rounded-full bg-brand-400" />
            {sparks.map(([x, y, color], index) => (
              <span
                key={`${x}-${y}-${index}`}
                className="firework-spark absolute left-1/2 top-16 h-3 w-3 rounded-full"
                style={{
                  backgroundColor: color,
                  ["--spark-x" as string]: x,
                  ["--spark-y" as string]: y,
                  animationDelay: `${index * 70}ms`
                }}
              />
            ))}
          </div>
        ) : null}
        {fireworks ? (
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-3xl font-black text-brand-700">
            嘉
          </div>
        ) : null}
        <p className="relative text-lg font-black text-brand-700">{message}</p>
        <button
          type="button"
          onClick={onClose}
          className="relative mt-4 h-10 rounded-lg bg-brand-600 px-5 text-sm font-bold text-white active:bg-brand-700"
        >
          好呀
        </button>
      </div>
      <style jsx>{`
        .firework-core {
          transform: translate(-50%, -50%);
          animation: firework-core 1.25s ease-out infinite;
        }

        .firework-spark {
          transform: translate(-50%, -50%);
          animation: firework-spark 1.25s ease-out infinite;
        }

        @keyframes firework-core {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.4);
          }
          20% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(2.6);
          }
        }

        @keyframes firework-spark {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.5);
          }
          18% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translate(
                calc(-50% + var(--spark-x)),
                calc(-50% + var(--spark-y))
              )
              scale(0.15);
          }
        }
      `}</style>
    </div>
  );
}
