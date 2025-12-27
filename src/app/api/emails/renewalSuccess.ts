import { setupDB } from "@/lib/db";
import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_API_KEY);
const worker = setupDB();

interface Props {
  stripeCustomerId: string;
}

const baseAddress = process.env?.NEXT_PUBLIC_PROD_BASE_URL;

const current_time = new Date()
  .toLocaleString("en-GB", { hour12: false })
  .replace(",", "");

export async function sendRenewalSuccessEmail({ stripeCustomerId }: Props) {
  const { data: customer, error } = await worker
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", stripeCustomerId)
    .single();

  if (error || !customer.user_id) {
    console.log(`Unable to fetch customer ID`);
    return;
  }

  // now retrive user email, name
  const { data: userData, error: userDataError } =
    await worker.auth.admin.getUserById(customer.user_id);

  if (userDataError) {
    console.log(`Unable to fetch user details`);
    return;
  }

  const user = userData?.user;
  const name = user?.user_metadata.name.split(" ")[0];

  // send the email
  await resend.emails.send({
    from: "Billing <contact@speedy.site>",
    to: [user?.email ? user.email : ""],
    cc: ["thespeedysite@gmail.com"],
    subject: "Your speedy.site subscription has been renewed",
    html: `<table width="100%" cellpadding="0" cellspacing="0" style="font-family: Arial, sans-serif; background-color: transparent; padding: 20px;">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
            <!-- Body -->
            <tr>
              <td style="padding: 30px; color: #333333;">
                <h2 style="margin-top: 0; font-size: 22px">Hi ${name || "there"},</h2>
    
                <p style="font-size: 16px; line-height: 1.6;">
                  We’re happy to let you know that your subscription was successfully renewed on ${current_time}.
                </p>
    
                <p style="font-size: 16px; line-height: 1.6;">
                  Your plan remains active, so you can continue using Speedy Site without any interruption.
                </p>
    
                <p style="font-size: 16px; line-height: 1.6;">
                  Review your
                  <a
                    href="${baseAddress}/account/subscription"
                    target="_blank"
                    style="color: #CC6CE7; text-decoration: underline;"
                  >
                    plan details</a>&nbsp;and monitor website experience on your <a
                        href="${baseAddress}/dashboard"
                        target="_blank"
                        style="color: #CC6CE7; text-decoration: underline;"
                      >
                    dashboard</a>.
                </p>
    
                <p style="font-size: 16px; line-height: 1.6;">
                  Thanks for being part of Speedy Site. We’re glad to have you with us :D
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
