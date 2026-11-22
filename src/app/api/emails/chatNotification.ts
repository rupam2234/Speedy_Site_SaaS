import { Resend } from "resend";
import { setupDB } from "@/lib/db";
import type { ChannelType } from "@/lib/chat/types";

interface ChatNotificationProps {
  orderId: string;
  websiteName: string;
  channelType: ChannelType;
  senderId: string;
  senderEmail: string;
  senderRole: string;
  messagePreview: string;
}

const resend = new Resend(process.env.RESEND_API_KEY ?? "build-placeholder");
const worker = setupDB();

// Dispatches in-app notifications and email alerts to conversation participants.
export async function dispatchChatNotification(props: ChatNotificationProps) {
  try {
    const { orderId, websiteName, channelType, senderId, senderEmail, senderRole, messagePreview } = props;
    const baseAddress = process.env.NEXT_PUBLIC_PROD_BASE_URL || "https://speedy.site";
    const previewTruncated = messagePreview.length > 160 ? `${messagePreview.slice(0, 157)}...` : messagePreview;

    const recipientUserIds: string[] = [];

    if (channelType === "client") {
      if (senderRole === "user") {
        // Find active assigned expert for this order
        const { data: assignment } = await (worker as any)
          .from("order_assignments")
          .select("expert_id")
          .eq("order_id", orderId)
          .eq("is_active", true)
          .maybeSingle();

        if (assignment?.expert_id) {
          recipientUserIds.push(assignment.expert_id);
        }
      } else {
        // Sender is expert; recipient is the customer who owns the order
        const { data: order } = await (worker as any)
          .from("orders")
          .select("user_id")
          .eq("order_id", orderId)
          .maybeSingle();

        if (order?.user_id && order.user_id !== senderId) {
          recipientUserIds.push(order.user_id);
        }
      }
    } else {
      // Internal channel: between admin and assigned expert
      if (senderRole === "admin") {
        const { data: assignment } = await (worker as any)
          .from("order_assignments")
          .select("expert_id")
          .eq("order_id", orderId)
          .eq("is_active", true)
          .maybeSingle();

        if (assignment?.expert_id) {
          recipientUserIds.push(assignment.expert_id);
        }
      } else {
        // Expert sent message; notify admins
        const { data: admins } = await (worker as any)
          .from("profiles")
          .select("id")
          .eq("role", "admin");

        for (const admin of admins ?? []) {
          if (admin.id && admin.id !== senderId) {
            recipientUserIds.push(admin.id);
          }
        }
      }
    }

    if (recipientUserIds.length === 0) return;

    // 1. Insert in-app notifications
    const targetLink =
      senderRole === "user"
        ? `/dashboard/expert/orders`
        : `/dashboard/managed-wp/status`;

    const notificationRows = recipientUserIds.map((userId) => ({
      user_id: userId,
      type: "chat_message",
      message: `New message on ${websiteName} (${channelType}): ${previewTruncated}`,
      link: targetLink,
      read: false,
    }));

    await (worker as any).from("notifications").insert(notificationRows);

    // 2. Fetch recipient emails for email notification
    const { data: recipientProfiles } = await (worker as any)
      .from("profiles")
      .select("email")
      .in("id", recipientUserIds);

    const recipientEmails = (recipientProfiles ?? [])
      .map((p: any) => p.email)
      .filter(Boolean);

    if (recipientEmails.length === 0) return;

    const emailSubject = `[Speedy Site] New message for ${websiteName} [${channelType.toUpperCase()}]`;

    await resend.emails.send({
      from: "Speedy Site Support <dispatch@speedy.site>",
      to: recipientEmails,
      subject: emailSubject,
      html: `
        <table width="100%" cellpadding="0" cellspacing="0" style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 24px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; text-align: left;">
                <tr>
                  <td style="padding: 20px 28px; background-color: #0f172a; color: #ffffff;">
                    <h2 style="margin: 0; font-size: 18px; font-weight: 600;">💬 New Order Message</h2>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 28px; color: #1e293b;">
                    <p style="font-size: 14px; margin-top: 0;">
                      You received a new message regarding <strong>${websiteName}</strong>:
                    </p>
                    <div style="background-color: #f1f5f9; border-left: 4px solid #3b82f6; padding: 14px; margin: 18px 0; border-radius: 4px;">
                      <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748b; font-weight: 600;">
                        From: ${senderEmail} (${senderRole})
                      </p>
                      <p style="margin: 0; font-size: 14px; color: #0f172a; white-space: pre-wrap;">${previewTruncated}</p>
                    </div>
                    <div style="margin-top: 24px;">
                      <a href="${baseAddress}${targetLink}" style="background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 10px 18px; font-size: 13px; font-weight: 600; border-radius: 6px; display: inline-block;">
                        Open Conversation
                      </a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      `,
    });
  } catch (err) {
    // Non-blocking notification error logging
    console.error("Chat notification dispatch error:", err);
  }
}
