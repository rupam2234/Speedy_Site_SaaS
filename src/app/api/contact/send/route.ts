import { sendContactEmail } from "../../emails/contact";

interface Props {
  name: string;
  email: string;
  message: string;
}

export async function POST(req: Request) {
  try {
    const { email, message, name }: Props = await req.json();

    if (!email || !message || !name) {
      return new Response(
        JSON.stringify({ message: "Bad request" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // get client IP
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0] || // behind proxy/CDN giving 1 for now lol
      "unknown"; // fallback

    await sendContactEmail({ name, email, message }, ip);

    return new Response(
      JSON.stringify({ message: "Email sent successfully" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
    
  } catch (err: any) {
    console.error("POST /contact error:", err);

    return new Response(
      JSON.stringify({ message: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}