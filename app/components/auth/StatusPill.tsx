// app/components/auth/StatusPill.tsx
import type { ReviewStatus } from "@/lib/reviews/types";

type StatusPillProps = {
  status: ReviewStatus;
};

export function StatusPill({ status }: StatusPillProps) {
  const map: Record<ReviewStatus, { label: string; className: string }> = {
    new: {
      label: "New",
      className: "bg-violet-50 text-violet-700",
    },
    drafted: {
      label: "Drafted",
      className: "bg-amber-50 text-amber-700",
    },
    approved: {
      label: "Approved",
      className: "bg-emerald-50 text-emerald-700",
    },
    posted: {
      label: "Posted",
      className: "bg-sky-50 text-sky-700",
    },
  };
  
  const cfg = map[status] || map.new;
  
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
