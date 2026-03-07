import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function newUserSignup({
  userEmail,
  userName,
}: {
  userEmail: string;
  userName?: string;
}) {
  const currentTime = new Date().toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  await resend.emails.send({
    from: "Speedy Site <contact@speedy.site>",
    to: ["thespeedysite@gmail.com"], // Your admin email
    subject: `🚀 New User: ${userEmail}`,
    html: `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f7f9; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 40px auto; padding: 20px; }
          .card { background: #ffffff; border-radius: 12px; border: 1px solid #e1e8ed; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
          .header { background: #000000; padding: 32px; text-align: center; }
          .content { padding: 40px 32px; }
          .footer { padding: 24px; text-align: center; color: #8898aa; font-size: 12px; }
          .badge { display: inline-block; padding: 4px 12px; border-radius: 99px; background: #e2f9ee; color: #10b981; font-size: 11px; font-weight: bold; text-transform: uppercase; margin-bottom: 16px; }
          .title { margin: 0; font-size: 24px; font-weight: 800; color: #1a1f36; letter-spacing: -0.02em; }
          .avatar { width: 56px; height: 56px; background: #6366f1; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 24px; box-shadow: 0 4px 10px rgba(99, 102, 241, 0.2); }
          .info-grid { margin-top: 32px; border-top: 1px solid #f0f2f4; padding-top: 24px; }
          .label { color: #697386; font-size: 14px; font-weight: 500; }
          .value { color: #1a1f36; font-size: 14px; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <!-- Admin Header -->
            <div class="header">
              <span style="color: #f8f3e1; font-weight: 800; font-size: 20px; letter-spacing: -1px;">SPEEDY SITE ADMIN</span>
            </div>
            
            <div class="content">
              <div style="text-align: center;">
                <span class="badge">Growth</span>
                <h1 class="title">New User Registered</h1>
                <p style="color: #4f566b; font-size: 16px; line-height: 24px; margin-top: 8px;">
                  Success! A new account has been created on your platform.
                </p>
              </div>

              <div class="info-grid">
                <table width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td class="label" style="padding: 12px 0;">Full Name</td>
                    <td class="value" style="padding: 12px 0; text-align: right;">${userName || "Not provided"}</td>
                  </tr>
                  <tr>
                    <td class="label" style="padding: 12px 0;">Email Address</td>
                    <td class="value" style="padding: 12px 0; text-align: right; color: #6366f1;">${userEmail}</td>
                  </tr>
                  <tr>
                    <td class="label" style="padding: 12px 0;">Registration Time</td>
                    <td class="value" style="padding: 12px 0; text-align: right;">${currentTime}</td>
                  </tr>
                </table>
              </div>
            </div>

            <div class="footer">
              <p>© ${new Date().getFullYear()} Speedy Site Internal Notifications</p>
            </div>
          </div>
        </div>
      </body>
    </html>
    `,
  });
}