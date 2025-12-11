// app/components/OnboardingPanel.tsx
"use client";

type OnboardingPanelProps = {
  salonName: string;
};

export function OnboardingPanel({ salonName }: OnboardingPanelProps) {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="max-w-3xl w-full rounded-2xl border border-slate-200 bg-white/80 shadow-sm p-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 mb-4">
          <span className="h-2 w-2 rounded-full bg-indigo-500" />
          New account · onboarding
        </div>

        <h1 className="text-2xl font-semibold text-slate-900 mb-2">
          Welcome, {salonName} ✨
        </h1>
        <p className="text-sm text-slate-600 mb-6">
          이 계정에는 아직 불러온 리뷰가 없습니다.
          <br />
          지금은 주인님(오퍼레이터)이 과거 Google/Yelp 리뷰를 한 번 세팅해주고,
          이후부터는 자동으로 들어오도록 확장하는 구조로 갈 거예요.
        </p>

        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold text-slate-500 mb-2">
              STEP 1 · Past reviews
            </div>
            <div className="text-sm text-slate-800 mb-1">
              과거 리뷰 한 번에 세팅
            </div>
            <p className="text-xs text-slate-500">
              우리가 내부에서 CSV나 API로 지난 리뷰들을 한 번에 넣어줍니다.
              가게 사장님이 직접 CSV를 다룰 일은 없고,{" "}
              <span className="font-medium">“한 번 세팅 서비스”</span>로 포지셔닝.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold text-slate-500 mb-2">
              STEP 2 · AI replies
            </div>
            <div className="text-sm text-slate-800 mb-1">
              리뷰당 AI 자동 답글 초안
            </div>
            <p className="text-xs text-slate-500">
              리뷰가 들어오면 <span className="font-medium">Generate replies</span>{" "}
              버튼으로 톤에 맞는 답글 초안을 생성하고,
              <span className="font-medium">Approve</span> 시 실제 답글로 저장합니다.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold text-slate-500 mb-2">
              STEP 3 · Auto-post & email
            </div>
            <div className="text-sm text-slate-800 mb-1">
              자동 게시 + 이메일 리포트
            </div>
            <p className="text-xs text-slate-500">
              다음 단계에서는 Google/Yelp에 답글을 자동 게시하고,
              사장님 이메일로 “오늘 자동으로 답글 처리된 리뷰” 요약 메일을
              보내는 흐름까지 확장할 예정입니다.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-dashed border-indigo-200 bg-indigo-50 px-4 py-3 text-xs text-indigo-800">
          <div className="font-medium mb-1">지금 할 일 (오퍼레이터용 메모)</div>
          <ul className="list-disc list-inside space-y-1">
            <li>
              Supabase <span className="font-mono">reviews</span> 에{" "}
              {salonName}의 과거 리뷰를 CSV로 한 번 import
            </li>
            <li>
              대시보드에서 Generate / Approve 플로우 테스트 후,
              데모 영상 촬영
            </li>
            <li>
              사장님에게는 “우리가 과거 리뷰를 모두 세팅해주고, 이후엔 자동으로
              관리해준다”는 메시지로 설명
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
