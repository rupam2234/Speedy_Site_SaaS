import { Resend } from "resend";

export interface ExpertAssignmentEmailProps {
  expertEmail: string;
  expertName?: string;
  siteDomain: string;
  customerEmail?: string;
  customerId?: string;
  orderId: string;
  slaHours?: number;
}

const resend = new Resend(process.env.RESEND_API_KEY ?? "build-placeholder");

export async function emailExpertAssignment(props: ExpertAssignmentEmailProps) {
  const baseAddress = process.env.NEXT_PUBLIC_PROD_BASE_URL || "https://speedy.site";
  const site = props.siteDomain || "Unnamed Site";
  const customer = props.customerEmail || props.customerId || "Customer";
  const sla = props.slaHours ?? 24;
  const ordersUrl = `${baseAddress}/dashboard/orders`;

  try {
    const res = await resend.emails.send({
      from: "Speedy Site Dispatch <dispatch@speedy.site>",
      to: [props.expertEmail],
      subject: `[Speedy Site Assignment] New Optimization Task: ${site}`,
      html: `
        <table width="100%" cellpadding="0" cellspacing="0" style="font-family: Arial, sans-serif; background-color: #f7f9fb; padding: 24px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; text-align: left;">
                <tr>
                  <td style="padding: 24px 32px; background-color: #0f172a; color: #ffffff;">
                    <h2 style="margin: 0; font-size: 20px; font-weight: 600;">🛠️ New Work Assignment</h2>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 32px; color: #1e293b;">
                    <p style="font-size: 15px; line-height: 1.6; margin-top: 0;">
                      Hello ${props.expertName ?? "Expert"},
                    </p>
                    <p style="font-size: 15px; line-height: 1.6;">
                      A new WordPress optimization order has been assigned to you. Please review the details below and begin triage within your SLA window:
                    </p>

                    <div style="background-color: #f1f5f9; border-radius: 6px; padding: 16px; margin: 20px 0;">
                      <table width="100%" cellpadding="6" cellspacing="0" style="font-size: 14px;">
                        <tr>
                          <td width="140" style="color: #64748b; font-weight: 600;">Website:</td>
                          <td style="color: #0f172a; font-weight: 700;">${site}</td>
                        </tr>
                        <tr>
                          <td style="color: #64748b; font-weight: 600;">Customer:</td>
                          <td style="color: #0f172a;">${customer}</td>
                        </tr>
                        <tr>
                          <td style="color: #64748b; font-weight: 600;">Order ID:</td>
                          <td style="color: #0f172a; font-family: monospace; font-size: 12px;">${props.orderId}</td>
                        </tr>
                        <tr>
                          <td style="color: #64748b; font-weight: 600;">SLA Window:</td>
                          <td style="color: #059669; font-weight: 700;">${sla} Hours</td>
                        </tr>
                      </table>
                    </div>

                    <div style="margin-top: 32px; text-align: center;">
                      <a href="${ordersUrl}" target="_blank"
                         style="background-color: #059669; color: #ffffff; padding: 12px 24px; border-radius: 6px; font-size: 14px; font-weight: 600; text-decoration: none; display: inline-block;">
                        View Assignment in Orders Portal
                      </a>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 20px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center;">
                    Speedy Site Developer Operations & Dispatch
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
    console.error("Failed to send expert assignment email:", err);
    return { success: false, error: err.message };
  }
}
