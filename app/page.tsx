// app/page.tsx
import { redirect } from "next/navigation";

export default function Home() {
  // 앱 첫 진입은 항상 이메일 입력 화면으로
  redirect("/start");
}
