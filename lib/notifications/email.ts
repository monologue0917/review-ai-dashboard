// lib/notifications/email.ts

type AutoReplyEmailParams = {
  to: string;
  salonName?: string | null;
  source: "google" | "yelp" | "other";
  rating?: number | null;
  reviewText: string;
  replyText?: string | null;
};

export async function sendReviewAutoReplyEmail({
  to,
  salonName,
  source,
  rating,
  reviewText,
  replyText,
}: AutoReplyEmailParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.REVIEWAI_EMAIL_FROM ?? "ReviewAI <no-reply@example.com>";

  const sourceLabel =
    source === "google" ? "Google" : source === "yelp" ? "Yelp" : "Review";

  const subject = `[${salonName ?? "Your business"}] New ${sourceLabel} review auto-replied`;

  const ratingText =
    typeof rating === "number" ? `${rating.toFixed(1)} / 5` : "N/A";

  const previewText = `New ${sourceLabel} review was auto-replied. Rating: ${ratingText}`;

  const plainText = [
    `Hi,`,
    ``,
    `A new ${sourceLabel} review was automatically replied to by ReviewAI.`,
    ``,
    `Salon: ${salonName ?? "-"}`,
    `Rating: ${ratingText}`,
    ``,
    `Review:`,
    reviewText,
    ``,
    `Reply:`,
    replyText ?? "(reply text not available in this email payload)",
    ``,
    `--`,
    `ReviewAI`,
  ].join("\n");

  const html = `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;font-size:14px;color:#0f172a;line-height:1.5;">
    <p style="margin:0 0 12px 0;">Hi,</p>
    <p style="margin:0 0 12px 0;">
      A new <strong>${sourceLabel}</strong> review was automatically replied to by <strong>ReviewAI</strong>.
    </p>
    <table style="border-collapse:collapse;margin:0 0 16px 0;font-size:13px;">
      <tr>
        <td style="padding:4px 8px;color:#64748b;">Salon</td>
        <td style="padding:4px 8px;color:#0f172a;"><strong>${salonName ?? "-"}</strong></td>
      </tr>
      <tr>
        <td style="padding:4px 8px;color:#64748b;">Source</td>
        <td style="padding:4px 8px;color:#0f172a;">${sourceLabel}</td>
      </tr>
      <tr>
        <td style="padding:4px 8px;color:#64748b;">Rating</td>
        <td style="padding:4px 8px;color:#0f172a;">${ratingText}</td>
      </tr>
    </table>

    <div style="margin:0 0 16px 0;">
      <div style="font-size:12px;color:#64748b;margin-bottom:4px;">Review</div>
      <div style="padding:10px 12px;border-radius:8px;background:#f8fafc;border:1px solid #e2e8f0;">
        ${escapeHtml(reviewText)}
      </div>
    </div>

    <div style="margin:0 0 20px 0;">
      <div style="font-size:12px;color:#64748b;margin-bottom:4px;">Reply</div>
      <div style="padding:10px 12px;border-radius:8px;background:#ecfeff;border:1px solid #bae6fd;">
        ${escapeHtml(
          replyText ?? "(reply text not available in this email payload)"
        )}
      </div>
    </div>

    <p style="margin:0 0 8px 0;color:#64748b;font-size:12px;">
      You're receiving this email because auto-reply is enabled in your ReviewAI settings.
    </p>
    <p style="margin:0;color:#94a3b8;font-size:11px;">
      — ReviewAI
    </p>
  </div>
  `;

  // 실제 이메일 전송
  if (!apiKey) {
    // 개발 단계 / 키 미설정 시에는 그냥 로그만 남기고 스킵
    console.warn(
      "[sendReviewAutoReplyEmail] RESEND_API_KEY is not set. Skipping actual email send."
    );
    console.log("[sendReviewAutoReplyEmail] Preview:", {
      to,
      from,
      subject,
      previewText,
      plainText,
    });
    return;
  }

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      text: plainText,
      html,
    }),
  });
}

// 간단한 HTML escape 유틸
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
