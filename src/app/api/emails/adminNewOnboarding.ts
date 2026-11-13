import { Resend } from "resend";

export interface AdminNewOnboardingEmailProps {
  orderId?: string;
  onboardingId?: string;
  userId: string;
  userEmail?: string;
  siteName?: string;
  websiteName?: string;
  createdAt?: string;
}

const resend = new Resend(process.env.RESEND_API_KEY ?? "build-placeholder");

export async function emailAdminNewOnboarding(props: AdminNewOnboardingEmailProps) {
  const baseAddress = process.env.NEXT_PUBLIC_PROD_BASE_URL || "https://speedy.site";
  const site = props.websiteName || props.siteName || "Unnamed Site";
  const identifier = props.orderId || props.onboardingId || "N/A";
  const email = props.userEmail || "Not provided";
  const created = props.createdAt
    ? new Date(props.createdAt).toLocaleString()
    : new Date().toLocaleString();

  const triageUrl = `${baseAddress}/dashboard/queue`;

  try {
    const res = await resend.emails.send({
      from: "Speedy Site Alerts <alerts@speedy.site>",
      to: ["thespeedysite@gmail.com"],
      subject: `[Speedy Site Intake] New Customer Onboarding: ${site}`,
      html: `
        <table width="100%" cellpadding="0" cellspacing="0" style="font-family: Arial, sans-serif; background-color: #f7f9fb; padding: 24px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; text-align: left;">
                <tr>
                  <td style="padding: 24px 32px; background-color: #0f172a; color: #ffffff;">
                    <h2 style="margin: 0; font-size: 20px; font-weight: 600;">🚀 New Customer Onboarding Received</h2>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 32px; color: #1e293b;">
                    <p style="font-size: 15px; line-height: 1.6; margin-top: 0;">
                      A new website onboarding event has been registered and is ready for expert assignment & triage:
                    </p>

                    <div style="background-color: #f1f5f9; border-radius: 6px; padding: 16px; margin: 20px 0;">
                      <table width="100%" cellpadding="6" cellspacing="0" style="font-size: 14px;">
                        <tr>
                          <td width="140" style="color: #64748b; font-weight: 600;">Website:</td>
                          <td style="color: #0f172a; font-weight: 700;">${site}</td>
                        </tr>
                        <tr>
                          <td style="color: #64748b; font-weight: 600;">Customer Email:</td>
                          <td style="color: #0f172a;">${email}</td>
                        </tr>
                        <tr>
                          <td style="color: #64748b; font-weight: 600;">Customer User ID:</td>
                          <td style="color: #0f172a; font-family: monospace; font-size: 12px;">${props.userId}</td>
                        </tr>
                        <tr>
                          <td style="color: #64748b; font-weight: 600;">Order/Onboarding ID:</td>
                          <td style="color: #0f172a; font-family: monospace; font-size: 12px;">${identifier}</td>
                        </tr>
                        <tr>
                          <td style="color: #64748b; font-weight: 600;">Timestamp:</td>
                          <td style="color: #0f172a;">${created}</td>
                        </tr>
                      </table>
                    </div>

                    <div style="margin-top: 32px; text-align: center;">
                      <a href="${triageUrl}" target="_blank"
                         style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 6px; font-size: 14px; font-weight: 600; text-decoration: none; display: inline-block;">
                        Open Admin Queue & Triage
                      </a>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 20px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center;">
                    Speedy Site Admin Alert Notification System
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      `,
    });

    return { success: true, id: res.data?.id };
  } catch (err: any) {
    console.error("Failed to send admin new onboarding alert:", err);
    return { success: false, error: err.message };
  }
}
