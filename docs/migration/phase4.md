## Migration Phase 4: Email Templates

### ✅ Completed Tasks
1. **Retire `subscriptionCreated` email template**
   - Removed legacy recurring subscription onboarding email templates and handlers.
   - Cleaned up obsolete subscription references from notification dispatcher.
2. **Update `renewalSuccess` template**
   - Updated copy and context data to align with annual managed service renewals instead of recurring Stripe subscriptions.
3. **Managed Service onboarding emails**
   - Introduced and verified `newManagedOrder` notification triggered on successful one-time service checkout (`checkout.session.completed`).

### Pending Tasks
- End-to-end staging smoke test of email dispatch pipeline with live SendGrid / Resend credentials.
- Add notification template for order assignment status changes (ties into Admin & Expert management flow).

### Notes
* Customer-facing communications now exclusively refer to one-time service purchases and yearly Managed WP licenses, removing all "recurring monthly billing" terminology.
