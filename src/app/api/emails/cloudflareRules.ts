import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const baseAddress = process.env?.NEXT_PUBLIC_PROD_BASE_URL;
const current_time = new Date()
  .toLocaleString("en-GB", { hour12: false })
  .replace(",", "");

interface Props {
  ruleName: string;
  ruleStatus?: boolean;
  userEmail: string;
  userName: string | undefined;
  site: string;
}

export async function CacheRuleUpdated({
  ruleName,
  userEmail,
  userName,
  site,
}: Props) {
  await resend.emails.send({
    from: "Cache Rules <contact@speedy.site>",
    to: [userEmail],
    cc: ["thespeedysite@gmail.com"],
    subject: `Cache rule for ${site} has been updated`,
    html: `<table width="100%" cellpadding="0" cellspacing="0" style="font-family: Arial, sans-serif; background-color: transparent; padding: 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
                <!-- Body -->
                <tr>
                  <td style="padding: 30px; color: #333333;">
                    <h2 style="margin-top: 0; font-size: 22px">Hi ${userName ? userName : "there"},</h2>
        
                    <p style="font-size: 16px; line-height: 1.6;">
                      This is to inform you that Cloudflare cache rule [${ruleName}] for your site: ${site}, has been successfully updated on ${current_time}.
                    </p>
        
                    <p style="font-size: 16px; line-height: 1.6;">
                      Review your
                      <a
                        href="${baseAddress}/dashboard/cloudflare?site=${site}"
                        target="_blank"
                        style="color: #CC6CE7; text-decoration: underline;"
                      >
                        cache rules</a>&nbsp;and ensure accuracy.
                    </p>
        
                    <p style="font-size: 16px; line-height: 1.6;">
                      Please reach out if you are unaware of this change.
                    </p>
                  </td>
                </tr>
        
                <!-- Footer -->
                <tr>
                  <td style="padding: 20px; text-align: center; font-size: 12px; color: #888888;">
                    <p>© ${new Date().getFullYear()} Speedy Site. All rights reserved.</p>
                    <p>
                      <a href="${baseAddress}/unsubscribe" style="color: #888888; text-decoration: underline;">
                        Unsubscribe
                      </a>
                    </p>
                  </td>
                </tr>
        
              </table>
            </td>
          </tr>
        </table>`,
  });
}

export async function CacheRuleDisabled({
  ruleName,
  ruleStatus,
  userEmail,
  userName,
  site,
}: Props) {
  await resend.emails.send({
    from: "Cache Rules <contact@speedy.site>",
    to: [userEmail],
    cc: ["thespeedysite@gmail.com"],
    subject: `Cache rule for ${site} has been disabled`,
    html: `<table width="100%" cellpadding="0" cellspacing="0" style="font-family: Arial, sans-serif; background-color: transparent; padding: 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
                  <!-- Body -->
                  <tr>
                    <td style="padding: 30px; color: #333333;">
                      <h2 style="margin-top: 0; font-size: 22px">Hi ${userName ? userName : "there"},</h2>
          
                      <p style="font-size: 16px; line-height: 1.6;">
                        This is to inform you that Cloudflare cache rule [${ruleName}] for your site: ${site}, has been ${ruleStatus === true ? "disabled" : "enabled"} on ${current_time}.
                      </p>
          
                      <p style="font-size: 16px; line-height: 1.6;">
                        Review your
                        <a
                          href="${baseAddress}/dashboard/cloudflare?site=${site}"
                          target="_blank"
                          style="color: #CC6CE7; text-decoration: underline;"
                        >
                          cache rules</a>&nbsp;to ensure accuracy.
                      </p>
          
                      <p style="font-size: 16px; line-height: 1.6;">
                        You can ${ruleStatus === true ? "enabled" : "disabled"} this rule from the rule row’s context menu.
                      </p>
                    </td>
                  </tr>
          
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 20px; text-align: center; font-size: 12px; color: #888888;">
                      <p>© ${new Date().getFullYear()} Speedy Site. All rights reserved.</p>
                      <p>
                        <a href="${baseAddress}/unsubscribe" style="color: #888888; text-decoration: underline;">
                          Unsubscribe
                        </a>
                      </p>
                    </td>
                  </tr>
          
                </table>
              </td>
            </tr>
          </table>`,
  });
}
