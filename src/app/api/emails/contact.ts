import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

/* -----------------------------
   1. Manual Validation Logic
------------------------------*/
const validate = (data: any) => {
  const { name, email, message } = data;
  
  // Basic Email Regex (RFC 5322 Light)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!name || typeof name !== "string" || name.length < 2 || name.length > 100) return "Invalid name";
  if (!email || typeof email !== "string" || !emailRegex.test(email)) return "Invalid email address";
  if (!message || typeof message !== "string" || message.length < 10 || message.length > 5000) return "Message too short or too long";
  
  return null; // No error
};

/* -----------------------------
   2. Simple In-Memory Rate Limit
------------------------------*/
const rateLimitMap = new Map<string, number>();

function isRateLimited(ip: string) {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const lastRequest = rateLimitMap.get(ip);
  if (lastRequest && now - lastRequest < windowMs) return true;
  rateLimitMap.set(ip, now);
  return false;
}

/* -----------------------------
   3. Escape HTML Utility
------------------------------*/
function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* -----------------------------
   4. Main Function
------------------------------*/
export async function sendContactEmail(formData: any, ip: string) {
  try {
    // Honeypot check (fastest exit)
    if (formData?.honeypot) return { error: "Spam detected" };

    // Rate limiting
    if (isRateLimited(ip)) return { error: "Too many requests" };

    // Manual Sanitization & Trimming
    const name = (formData?.name || "").trim();
    const email = (formData?.email || "").trim();
    const message = (formData?.message || "").trim();

    // Validation
    const validationError = validate({ name, email, message });
    if (validationError) return { error: validationError };

    // Escape for safe HTML delivery
    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeMessage = escapeHtml(message);

    /* --- Send Emails --- */
    await resend.emails.send({
      from: "Speedy Site Contact <contact@speedy.site>",
      to: ["contact@speedy.site"],
      cc: ["thespeedysite@gmail.com"],
      replyTo: safeEmail,
      subject: `Query from ${safeName}`,
      html: `<p style="white-space: pre-line;">${safeMessage}</p>`,
    });

    await resend.emails.send({
      from: "Speedy Site <contact@speedy.site>",
      to: [safeEmail],
      subject: "We received your message 🚀",
      html: `<p>Hi ${safeName},</p><p>We’ve received your message and will get back to you soon.</p>`,
    });

    return { success: true };

  } catch (error) {
    console.error("Contact email error:", error);
    return { error: "Something went wrong" };
  }
}