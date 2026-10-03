# Joining is gated by admin-approved Access requests, not by sign-up

StrideVolt is invite-only. Someone who wants to join submits only their email, which is stored as an Access request in a `public.access_requests` table. No Supabase auth user exists at that point. The Admin approves by setting the row's `status` to `approved` in the Supabase table editor. A database webhook then calls an Edge Function that runs `auth.admin.inviteUserByEmail`, and the person sets their password from that Invite. We chose this over creating the auth user at sign-up with an `approved` flag in `app_metadata`. That approach would leave live, unapproved accounts that every route and RLS policy must remember to block. Here, nothing can authenticate until the Admin approves, and Supabase's invite flow handles both proving the address and choosing a password.

## Consequences

- Every sign-up shows the same message whatever the request's status (new, pending, approved or rejected), so the form never reveals who has asked to join.
- A rejected request sends no email and can be moved to `approved` later, which sends the Invite then.
- An expired or reused Invite is recovered by entering the email again. If the request is approved but the account was never completed, a new Invite is sent with no Admin action.
- Supabase's built-in SMTP only delivers to project team members, so custom SMTP (Resend) is required for any real Invite.
