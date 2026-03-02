import { Resend } from "resend";
import { z } from "zod";

const resend = new Resend(process.env.RESEND_API_KEY);

/* -----------------------------
   1. Validation Schema (Zod)
------------------------------*/
const ContactSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  message: z.string().min(10).max(5000),
  honeypot: z.string().optional(), // spam trap
});

/* -----------------------------
   2. Simple In-Memory Rate Limit
   (Use Redis in production)
------------------------------*/
const rateLimitMap = new Map<string, number>();

function isRateLimited(ip: string) {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const lastRequest = rateLimitMap.get(ip);

  if (lastRequest && now - lastRequest < windowMs) {
    return true;
  }

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
export async function sendContactEmail(
  formData: unknown,
  ip: string
) {
  try {
    /* Trim inputs first */
    const trimmed =
      typeof formData === "object" && formData !== null
        ? Object.fromEntries(
            Object.entries(formData as Record<string, string>).map(
              ([k, v]) => [k, typeof v === "string" ? v.trim() : v]
            )
          )
        : formData;

    /* Validate */
    const parsed = ContactSchema.safeParse(trimmed);

    if (!parsed.success) {
      return { error: "Invalid form input" };
    }

    const { name, email, message, honeypot } = parsed.data;

    /* Honeypot spam protection */
    if (honeypot) {
      return { error: "Spam detected" };
    }

    /* Rate limiting */
    if (isRateLimited(ip)) {
      return { error: "Too many requests. Please wait." };
    }

    /* Escape HTML */
    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeMessage = escapeHtml(message);

    /* -----------------------------
       Send Admin Email
    ------------------------------*/
    await resend.emails.send({
      from: "Speedy Site Contact <contact@speedy.site>",
      to: ["contact@speedy.site"],
      cc: ["thespeedysite@gmail.com"],
      replyTo: safeEmail,
      subject: `Query from ${safeName}`,
      html: `
        <p style="white-space: pre-line;">${safeMessage}</p>
      `,
    });

    /* -----------------------------
       Auto-Reply Email to User
    ------------------------------*/
    await resend.emails.send({
      from: "Speedy Site <contact@speedy.site>",
      to: [safeEmail],
      subject: "We received your message 🚀",
      html: `
        <p>Hi ${safeName},</p>
        <p>Thanks for reaching out! We’ve received your message and will get back to you as soon as possible.</p>
        <p>— Speedy Site Team</p>
      `,
    });

    return { success: true };

  } catch (error) {
    console.error("Contact email error:", error);
    return { error: "Something went wrong" };
  }
}