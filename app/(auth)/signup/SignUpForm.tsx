// app/(auth)/signup/SignUpForm.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type SignUpFormData = {
  email: string;
  contactName: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
};

type OnboardingData = {
  salonName: string;
  country: string;
  state: string;
  city: string;
  customCity: string;  // "Other" 선택 시 직접 입력용
};

const US_STATES = [
  { value: "CA", label: "California" },
  { value: "NY", label: "New York" },
  { value: "TX", label: "Texas" },
  { value: "FL", label: "Florida" },
  { value: "WA", label: "Washington" },
  { value: "IL", label: "Illinois" },
  { value: "MA", label: "Massachusetts" },
  { value: "GA", label: "Georgia" },
  { value: "NJ", label: "New Jersey" },
  { value: "PA", label: "Pennsylvania" },
];

// 주별 주요 도시 (네일샵 많은 지역 위주)
const US_CITIES: Record<string, string[]> = {
  CA: [
    "Los Angeles",
    "San Francisco",
    "San Diego",
    "San Jose",
    "Sacramento",
    "Irvine",
    "Fremont",
    "Oakland",
    "Anaheim",
    "Long Beach",
  ],
  NY: [
    "New York City",
    "Brooklyn",
    "Queens",
    "Manhattan",
    "Buffalo",
    "Albany",
    "Yonkers",
    "Syracuse",
    "Rochester",
    "Flushing",
  ],
  TX: [
    "Houston",
    "Dallas",
    "Austin",
    "San Antonio",
    "Fort Worth",
    "Plano",
    "Arlington",
    "El Paso",
    "Frisco",
    "Irving",
  ],
  FL: [
    "Miami",
    "Orlando",
    "Tampa",
    "Jacksonville",
    "Fort Lauderdale",
    "West Palm Beach",
    "Hialeah",
    "St. Petersburg",
    "Pembroke Pines",
    "Hollywood",
  ],
  WA: [
    "Seattle",
    "Tacoma",
    "Bellevue",
    "Spokane",
    "Vancouver",
    "Kent",
    "Everett",
    "Renton",
    "Federal Way",
    "Kirkland",
  ],
  IL: [
    "Chicago",
    "Aurora",
    "Naperville",
    "Joliet",
    "Rockford",
    "Springfield",
    "Elgin",
    "Peoria",
    "Schaumburg",
    "Evanston",
  ],
  MA: [
    "Boston",
    "Cambridge",
    "Worcester",
    "Springfield",
    "Lowell",
    "Quincy",
    "Brockton",
    "New Bedford",
    "Lynn",
    "Somerville",
  ],
  GA: [
    "Atlanta",
    "Augusta",
    "Savannah",
    "Columbus",
    "Marietta",
    "Sandy Springs",
    "Roswell",
    "Johns Creek",
    "Alpharetta",
    "Duluth",
  ],
  NJ: [
    "Newark",
    "Jersey City",
    "Paterson",
    "Elizabeth",
    "Edison",
    "Trenton",
    "Clifton",
    "Cherry Hill",
    "Fort Lee",
    "Hoboken",
  ],
  PA: [
    "Philadelphia",
    "Pittsburgh",
    "Allentown",
    "Reading",
    "Erie",
    "Scranton",
    "Bethlehem",
    "Lancaster",
    "Harrisburg",
    "King of Prussia",
  ],
};

export default function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // /signup?email=... 으로 들어온 값
  const emailFromQuery = searchParams.get("email") ?? "";

  // 1단계 / 2단계
  const [step, setStep] = useState<1 | 2>(1);

  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [formData, setFormData] = useState<SignUpFormData>({
    email: emailFromQuery,
    contactName: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
  });

  const [onboarding, setOnboarding] = useState<OnboardingData>({
    salonName: "",
    country: "United States",
    state: "",
    city: "",
    customCity: "",
  });

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 쿼리스트링 email이 바뀌면 formData.email도 동기화
  useEffect(() => {
    if (emailFromQuery) {
      setFormData((prev) => ({ ...prev, email: emailFromQuery }));
    }
  }, [emailFromQuery]);

  // 1단계 input 핸들러
  const handleChange =
    (field: keyof SignUpFormData) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      let value = e.target.value;

      // Contact name은 Title Case로 자동 변환 (Lee Hyeonseok)
      if (field === "contactName") {
        value = value
          .toLowerCase()
          .replace(/\b\w/g, (char) => char.toUpperCase());
      }

      setFormData((prev) => ({ ...prev, [field]: value }));
    };

  // 2단계 input 핸들러
  const handleOnboardingChange =
    (field: keyof OnboardingData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = e.target.value;

      // State 변경 시 City 초기화
      if (field === "state") {
        setOnboarding((prev) => ({ ...prev, state: value, city: "", customCity: "" }));
      } else {
        setOnboarding((prev) => ({ ...prev, [field]: value }));
      }
    };

  // 선택된 State의 도시 목록
  const availableCities = onboarding.state ? US_CITIES[onboarding.state] || [] : [];

  // 1단계 제출 → 2단계로 이동
  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!agreedToTerms) {
      setError("Please agree to the Terms of Service and Privacy Policy.");
      return;
    }
    if (!formData.contactName.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!formData.phoneNumber.trim()) {
      setError("Please enter your phone number.");
      return;
    }
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Password and confirmation do not match.");
      return;
    }

    setError(null);
    setStep(2);
  };

  // 2단계 제출 → /api/auth/signup 호출 → 성공 시 /login으로 이동
  const handleCompleteSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!onboarding.salonName.trim()) {
      setError("Please enter your salon name.");
      return;
    }
    if (!onboarding.state) {
      setError("Please select a state.");
      return;
    }
    
    // City validation: 선택했거나 직접 입력했거나
    const finalCity = onboarding.city === "__other__" 
      ? onboarding.customCity.trim() 
      : onboarding.city;
    
    if (!finalCity) {
      setError("Please select or enter your city.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        ...formData,
        ...onboarding,
        city: finalCity,  // customCity 대신 최종 city 값 사용
      };

      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (!res.ok) {
        const msg =
          data?.error ||
          `Failed to complete signup (status ${res.status})`;
        console.error("[signup client] error:", msg, data);
        setError(msg);
        return;
      }

      // ✅ 여기서 첫화면(/start)이 아니라 로그인 페이지로 이동
      router.push(`/login?email=${encodeURIComponent(formData.email)}`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to complete signup");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Back 버튼
  const handleBack = () => {
    if (step === 1) {
      router.push("/start");
    } else {
      setStep(1);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#F7F8FA]">
      <div className="w-full max-w-[1440px] h-[900px] flex items-center justify-center">
        <div className="w-[440px] bg-white rounded-[12px] border border-[#E5E7EB] p-10 shadow-sm">
          {/* Header */}
          <div className="mb-6">
            <button
              type="button"
              onClick={handleBack}
              className="text-[#2563EB] hover:text-[#1D4ED8] text-[13px]"
            >
              Back
            </button>

            {step === 1 ? (
              <>
                <h1 className="mt-4 text-[#111827] tracking-tight text-[20px] font-semibold">
                  Create your ReviewAI account
                </h1>
                <p className="mt-1.5 text-[#6B7280] text-[13px]">
                  Tell us a few details so we can set up your workspace.
                </p>
              </>
            ) : (
              <>
                <h1 className="mt-4 text-[#111827] tracking-tight text-[20px] font-semibold">
                  Tell us about your salon
                </h1>
                <p className="mt-1.5 text-[#6B7280] text-[13px]">
                  We&apos;ll personalize your dashboard based on your location.
                </p>
              </>
            )}
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* STEP 1 */}
          {step === 1 && (
            <form onSubmit={handleStep1Submit} className="space-y-5">
              {/* Email (read-only) */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-[#374151] mb-2 text-[13px] font-medium"
                >
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  readOnly
                  className="w-full px-4 py-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg text-[#6B7280] cursor-not-allowed text-[14px]"
                />
              </div>

              {/* Contact name / Phone number */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="contactName"
                    className="block text-[#374151] mb-2 text-[13px] font-medium"
                  >
                    Contact name
                  </label>
                  <input
                    type="text"
                    id="contactName"
                    placeholder="Enter your full name"
                    value={formData.contactName}
                    onChange={handleChange("contactName")}
                    className="w-full px-4 py-3 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent text-[14px]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="phoneNumber"
                    className="block text-[#374151] mb-2 text-[13px] font-medium"
                  >
                    Phone number
                  </label>
                  <input
                    type="tel"
                    id="phoneNumber"
                    placeholder="(555) 123-4567"
                    value={formData.phoneNumber}
                    onChange={handleChange("phoneNumber")}
                    className="w-full px-4 py-3 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent text-[14px]"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-[#374151] mb-2 text-[13px] font-medium"
                >
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  placeholder="At least 8 characters"
                  value={formData.password}
                  onChange={handleChange("password")}
                  className="w-full px-4 py-3 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent text-[14px]"
                />
                <p className="mt-2 text-[#9CA3AF] text-[13px]">
                  Use at least 8 characters, including letters and numbers.
                </p>
              </div>

              {/* Confirm Password */}
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-[#374151] mb-2 text-[13px] font-medium"
                >
                  Confirm password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  placeholder="Re-enter your password"
                  value={formData.confirmPassword}
                  onChange={handleChange("confirmPassword")}
                  className="w-full px-4 py-3 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent text-[14px]"
                />
              </div>

              {/* Terms */}
              <div className="flex items-start gap-3 pt-2">
                <input
                  type="checkbox"
                  id="terms"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-1 w-4 h-4 text-[#2563EB] border-[#D1D5DB] rounded focus:ring-2 focus:ring-[#2563EB] cursor-pointer"
                />
                <label
                  htmlFor="terms"
                  className="text-[#374151] cursor-pointer text-[14px]"
                >
                  I agree to the{" "}
                  <a
                    href="#"
                    className="text-[#2563EB] hover:text-[#1D4ED8] hover:underline"
                  >
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a
                    href="#"
                    className="text-[#2563EB] hover:text-[#1D4ED8] hover:underline"
                  >
                    Privacy Policy
                  </a>
                  .
                </label>
              </div>

              <button
                type="submit"
                className={`w-full h-[44px] rounded-[10px] text-[14px] font-semibold transition-all duration-200 ${
                  agreedToTerms
                    ? "bg-[#2563EB] hover:bg-[#1D4ED8] text-white cursor-pointer"
                    : "bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed"
                }`}
                disabled={!agreedToTerms}
              >
                Continue
              </button>
            </form>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <form onSubmit={handleCompleteSignup} className="space-y-5">
              {/* Salon name */}
              <div>
                <label
                  htmlFor="salonName"
                  className="block text-[#374151] mb-2 text-[13px] font-medium"
                >
                  Salon name
                </label>
                <input
                  type="text"
                  id="salonName"
                  placeholder="Jenny's Nails"
                  value={onboarding.salonName}
                  onChange={handleOnboardingChange("salonName")}
                  className="w-full px-4 py-3 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent text-[14px]"
                />
              </div>

              {/* Country (read-only) */}
              <div>
                <label
                  htmlFor="country"
                  className="block text-[#374151] mb-2 text-[13px] font-medium"
                >
                  Country
                </label>
                <input
                  id="country"
                  type="text"
                  value={onboarding.country}
                  readOnly
                  className="w-full px-4 py-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg text-[14px] text-[#6B7280] cursor-not-allowed"
                />
              </div>

              {/* State + City */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="state"
                    className="block text-[#374151] mb-2 text-[13px] font-medium"
                  >
                    State
                  </label>
                  <select
                    id="state"
                    value={onboarding.state}
                    onChange={handleOnboardingChange("state")}
                    className="w-full px-4 py-3 border border-[#E5E7EB] rounded-lg bg-white text-[14px] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                  >
                    <option value="">Select a state</option>
                    {US_STATES.map((st) => (
                      <option key={st.value} value={st.value}>
                        {st.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="city"
                    className="block text-[#374151] mb-2 text-[13px] font-medium"
                  >
                    City
                  </label>
                  <select
                    id="city"
                    value={onboarding.city}
                    onChange={handleOnboardingChange("city")}
                    disabled={!onboarding.state}
                    className="w-full px-4 py-3 border border-[#E5E7EB] rounded-lg bg-white text-[14px] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent disabled:bg-[#F9FAFB] disabled:text-[#9CA3AF] disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {onboarding.state ? "Select a city" : "Select state first"}
                    </option>
                    {availableCities.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                    {onboarding.state && (
                      <option value="__other__">Other</option>
                    )}
                  </select>
                </div>
              </div>

              {/* "Other" 선택 시 직접 입력란 */}
              {onboarding.city === "__other__" && (
                <div>
                  <label
                    htmlFor="customCity"
                    className="block text-[#374151] mb-2 text-[13px] font-medium"
                  >
                    Enter your city
                  </label>
                  <input
                    type="text"
                    id="customCity"
                    placeholder="Type your city name"
                    value={onboarding.customCity}
                    onChange={handleOnboardingChange("customCity")}
                    className="w-full px-4 py-3 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent text-[14px]"
                  />
                </div>
              )}

              <p className="text-[12px] text-[#9CA3AF]">
                You can update your salon information later in Settings.
              </p>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-[44px] rounded-[10px] text-[14px] font-semibold transition-all duration-200 bg-[#2563EB] hover:bg-[#1D4ED8] text-white disabled:bg-[#9CA3AF] disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Creating your workspace..." : "Complete signup"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
