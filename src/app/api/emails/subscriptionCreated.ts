import { setupDB } from "@/lib/db";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const worker = setupDB();

interface Props {
  stripeCustomerId: string;
  billingCycleEnd: string;
  plan: "Basic" | "Pro" | "Agency" | "Free";
}

export async function SubscriptionCreated({
  stripeCustomerId,
  billingCycleEnd,
  plan,
}: Props) {
  const baseAddress = process.env?.NEXT_PUBLIC_PROD_BASE_URL;
  const planExpiresAt = new Date(billingCycleEnd)
    .toLocaleString("en-GB", { hour12: false })
    .replace(",", "");

  new Date().toISOString();

  const { data: customer, error } = await worker
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", stripeCustomerId)
    .single();

  if (error || !customer.user_id) {
    console.log(`Unable to fetch customer ID`);
    return;
  }

  // now retrive user data
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
    from: "Subscription <contact@speedy.site>",
    to: [user?.email ? user.email : ""],
    cc: ["thespeedysite@gmail.com"],
    subject: "Confirmation of Your Speedy.site Subscription",
    html: `<table width="100%" cellpadding="0" cellspacing="0" style="font-family: Arial, sans-serif; background-color: transparent; padding: 20px;">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
            <!-- Body -->
            <tr>
              <td style="padding: 30px; color: #333333;">
                <h2 style="margin-top: 0; font-size: 22px">Hi ${name || "there"},</h2>
    
                <p style="font-size: 16px; line-height: 1.6;">
                    We’re excited to let you know that your subscription to Speedy Site has been successful.
                </p>
    
                <p style="font-size: 16px; line-height: 1.6;">
                    You can start enjoying all the features and benefits right away.
                </p>
    
                <ul style="font-size: 16px; line-height: 1.6;">
                  <li> 
                    Active plan <a
                        href="${baseAddress}/account/subscription"
                        target="_blank"
                        style="color: #CC6CE7; text-decoration: underline;"
                    >
                        details
                    </a>
                  </li>
                  <li> 
                    Expires at ${planExpiresAt}
                  </li>
                </ul>
    
                <p style="font-size: 16px; line-height: 1.6;">
                    Thank you for joining Speedy Site — we’re thrilled to have you on board! 🎉
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
