// app/components/auth/StatusPill.tsx
import type { ReviewStatus } from "@/lib/reviews/types";

type StatusPillProps = {
  status: ReviewStatus;
};

export function StatusPill({ status }: StatusPillProps) {
  const map: Record<ReviewStatus, { label: string; className: string }> = {
    Drafted: {
      label: "Drafted",
      className: "bg-sky-50 text-sky-700",
    },
    New: {
      label: "New",
      className: "bg-amber-50 text-amber-700",
    },
    Approved: {
      label: "Approved",
      className: "bg-emerald-50 text-emerald-700",
    },
  };
  const cfg = map[status];
  return (
    <span
      className={
        "inline-flex items-center rounded-full px-2 py-1 text-[11px] font-medium " +
        cfg.className
      }
    >
      {cfg.label}
    </span>
  );
}
