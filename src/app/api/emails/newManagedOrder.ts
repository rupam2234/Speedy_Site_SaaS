import { Resend } from "resend";

type Props = {
    email: string;
    domain: string;
}

const resend = new Resend(process.env.RESEND_API_KEY);

export async function emailConfirmationForManagedService({ domain, email }: Props) {
    const baseAddress = process.env?.NEXT_PUBLIC_PROD_BASE_URL;

    if (!domain || !email) {
        return false;
    }

    await resend.emails.send({
        from: "New Order (Managed Service) <contact@speedy.site>",
        to: [email],
        cc: ["thespeedysite@gmail.com"],
        subject: "Confirmation of Your Speedy.site Performance Optimization Order",
        html: `<table width="100%" cellpadding="0" cellspacing="0" style="font-family: Arial, sans-serif; background-color: transparent; padding: 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
                <!-- Body -->
                <tr>
                  <td style="padding: 30px; color: #333333;">
                    <h2 style="margin-top: 0; font-size: 22px">Hi there,</h2>
        
                    <p style="font-size: 16px; line-height: 1.6;">
                        This is a confirmation that your purchase of the WordPress managed performance optimization and monitoring service at Speedy.site was successful.
                    </p>
                    <p style="font-size: 16px; line-height: 1.6;">
                        You can check your order status and <a href="${baseAddress}/account/subscription" target="_blank"
                            style="color: #CC6CE7; text-decoration: underline;">
                            chat with your manager here
                        </a> or explore your site's performance and Web Vitals trajectory across various sections at Speedy.site.
                    </p>

                    <p style="font-size: 16px; line-height: 1.6;">
                        Thank you for choosing Speedy Site — we’re thrilled to have you on board! 🎉
                    </p>
        
                  </td>
                </tr>
        
                <!-- Footer -->
                <tr>
                  <td style="padding: 20px; text-align: center; font-size: 12px; color: #888888;">
                    <p>© ${new Date().getFullYear()} Speedy Site. All rights reserved.</p>
                  </td>
                </tr>
        
              </table>
            </td>
          </tr>
        </table>`,
    });
}