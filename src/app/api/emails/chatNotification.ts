import { Resend } from "resend";
import { setupDB } from "@/lib/db";
import type { ChannelType } from "@/lib/chat/types";

export interface ChatNotificationProps {
  orderId: string;
  websiteName: string;
  channelType: ChannelType;
  senderId: string;
  senderEmail: string;
  senderRole: string;
  messagePreview: string;
}

export interface UnreadDigestMessage {
  id: string;
  senderEmail: string;
  senderRole: string;
  body: string;
  createdAt: string;
}

export interface UnreadDigestBatch {
  recipientEmail: string;
  recipientRole?: string;
  orderId: string;
  websiteName: string;
  channelType: ChannelType;
  messages: UnreadDigestMessage[];
}

const resend = new Resend(process.env.RESEND_API_KEY ?? "build-placeholder");
const worker = setupDB();

// Inserts immediate in-app bell notification rows into public.notifications.
export async function dispatchInAppChatNotification(props: ChatNotificationProps): Promise<void> {
  try {
    const { orderId, websiteName, channelType, senderId, senderRole, messagePreview } = props;
    const previewTruncated = messagePreview.length > 160 ? `${messagePreview.slice(0, 157)}...` : messagePreview;

    const recipientUserIds: string[] = [];

    if (channelType === "client") {
      if (senderRole === "user") {
        // Customer sent message; notify active assigned expert
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
        // Expert sent message; notify order owner
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
  } catch (err) {
    console.error("In-app chat notification error:", err);
  }
}

// Backward-compatible alias for in-app notification dispatch.
export const dispatchChatNotification = dispatchInAppChatNotification;

// Sends consolidated email digest for unread messages and marks email_notified_at.
export async function dispatchUnreadChatDigest(
  batch: UnreadDigestBatch
): Promise<{ success: boolean; messageCount: number; error?: string }> {
  try {
    if (!batch.recipientEmail || batch.messages.length === 0) {
      return { success: false, messageCount: 0, error: "Empty batch or missing recipient" };
    }

    const baseAddress = process.env.NEXT_PUBLIC_PROD_BASE_URL || "https://speedy.site";
    const targetLink =
      batch.recipientRole === "user"
        ? `${baseAddress}/dashboard/managed-wp/status`
        : `${baseAddress}/dashboard/expert/orders`;

    const channelUpper = batch.channelType.toUpperCase();
    const count = batch.messages.length;
    const countText = count === 1 ? "1 unread message" : `${count} unread messages`;
    const subject = `[Speedy Site] Unread message(s) for ${batch.websiteName} [${channelUpper}]`;

    const messageCardsHtml = batch.messages
      .map((msg) => {
        const preview = msg.body.length > 200 ? `${msg.body.slice(0, 197)}...` : msg.body;
        const formattedDate = new Date(msg.createdAt).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        return `
          <div style="background-color: #f1f5f9; border-left: 4px solid #3b82f6; padding: 12px 16px; margin: 12px 0; border-radius: 4px;">
            <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748b; font-weight: 600;">
              From: ${msg.senderEmail} (${msg.senderRole}) &bull; ${formattedDate}
            </p>
            <p style="margin: 0; font-size: 14px; color: #0f172a; white-space: pre-wrap; line-height: 1.4;">${preview}</p>
          </div>
        `;
      })
      .join("");

    const emailHtml = `
      <table width="100%" cellpadding="0" cellspacing="0" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 24px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; text-align: left; overflow: hidden;">
              <tr>
                <td style="padding: 20px 28px; background-color: #0f172a; color: #ffffff;">
                  <h2 style="margin: 0; font-size: 18px; font-weight: 600;">💬 Unread Order Message(s)</h2>
                </td>
              </tr>
              <tr>
                <td style="padding: 28px; color: #1e293b;">
                  <p style="font-size: 14px; margin-top: 0; line-height: 1.5;">
                    You have <strong>${countText}</strong> regarding <strong>${batch.websiteName}</strong> (${batch.channelType} channel):
                  </p>
                  ${messageCardsHtml}
                  <div style="margin-top: 24px;">
                    <a href="${targetLink}" style="background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 10px 20px; font-size: 13px; font-weight: 600; border-radius: 6px; display: inline-block;">
                      Open Conversation
                    </a>
                  </div>
                  <p style="margin-top: 28px; margin-bottom: 0; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 14px;">
                    This is an automated digest for unread messages on Speedy Site.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `;

    const { error: sendError } = await resend.emails.send({
      from: "Speedy Site Support <dispatch@speedy.site>",
      to: [batch.recipientEmail],
      subject,
      html: emailHtml,
    });

    if (sendError) {
      console.error("Resend email delivery failed:", sendError);
      return { success: false, messageCount: 0, error: sendError.message };
    }

    // Atomic update: stamp email_notified_at = now() for all dispatched messages
    const messageIds = batch.messages.map((m) => m.id);
    const { error: updateError } = await (worker as any)
      .from("order_messages")
      .update({ email_notified_at: new Date().toISOString() })
      .in("id", messageIds);

    if (updateError) {
      console.error("Failed to mark email_notified_at:", updateError);
    }

    return { success: true, messageCount: count };
  } catch (err: any) {
    console.error("Error in dispatchUnreadChatDigest:", err);
    return { success: false, messageCount: 0, error: err.message || "Unknown error" };
  }
}
