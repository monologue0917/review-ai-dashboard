// app/components/auth/ToneSelector.tsx
import type { Tone } from "@/lib/reviews/types";

type ToneSelectorProps = {
  tone: Tone;
  onToneChange: (tone: Tone) => void;
};

export function ToneSelector({ tone, onToneChange }: ToneSelectorProps) {
  const options: { value: Tone; label: string }[] = [
    { value: "friendly", label: "Friendly & casual" },
    { value: "professional", label: "Polite & professional" },
    { value: "premium", label: "Premium & luxurious" },
  ];

  return (
    <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onToneChange(opt.value)}
          className={
            "px-3 py-1 text-[11px] rounded-full " +
            (tone === opt.value
              ? "bg-white shadow-sm text-slate-900"
              : "text-slate-500")
          }
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
