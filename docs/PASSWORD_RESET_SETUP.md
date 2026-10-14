# Password recovery setup

The reset form uses `/api/auth/request-password-reset` and `/api/auth/verify-password-reset`, proxied to the FastAPI backend on Railway.

## Production email settings

Set these **on the Railway backend service**, then redeploy:

| Variable | Value |
| --- | --- |
| `FRONTEND_URL` | `https://scribsy.vercel.app` |
| `RESEND_API_KEY` | A Resend **sending-only** key restricted to the verified sending domain |
| `EMAIL_FROM` | `Scribsy <support@zelunhe.com>` |

`zelunhe.com` was verified for sending in the connected Resend account. Keep tracking disabled for password-reset links. Use a monitored sender address. Never put the sending key in Git, browser code, or a `NEXT_PUBLIC_` variable. Installing the ChatGPT Resend connection does not automatically copy credentials to Railway.

Resend uses HTTPS. Authenticated SMTP remains supported through `SMTP_SERVER`, `SMTP_PORT` (587 for STARTTLS, 465 for implicit TLS), `SMTP_USERNAME`, `SMTP_PASSWORD`, and optional `EMAIL_FROM` / `SMTP_SENDER_NAME`. SMTP requires outbound SMTP support from the hosting plan. If `RESEND_API_KEY` is set, Resend takes precedence and requires `EMAIL_FROM`.

## Recovery behavior

- Email lookup ignores case and surrounding whitespace. Unknown, inactive, and demo accounts do not receive reset links.
- Success messages do not disclose whether an account exists. Missing provider configuration returns a generic service-unavailable error for all addresses.
- Delivery failures return an error and roll back the new token, preserving a previously valid link.
- One message per minute and three per hour per account; repeated requests receive the same generic success response without sending more mail.
- Links expire after one hour; only the latest successfully issued link remains valid.
- New tokens are stored as SHA-256 hashes, not raw bearer secrets. Existing unexpired legacy links remain accepted.
- Token consumption and the password update are atomic. Resetting the password revokes prior sessions, resets failed-login lockout, and invalidates other reset tokens.
- Passwords require eight characters and a number, with a maximum of 72 UTF-8 bytes for the existing bcrypt implementation.
- Schema initialization adds `users.token_version` with a safe zero default to preserve existing accounts and sessions until a password reset.

## Verification

`python -m pytest tests -q` covers complete request → captured email → reset → login behavior, expired/reused tokens, replacement and cooldown, delivery failures, session revocation, password validation, and Resend transport. Tests use an isolated database and captured local email; they never send to users.

The UI uses the existing blue/white/navy authentication design. Recovery requests submit directly, without the old confirmation dialog. Missing links provide a fresh-request action; successful resets lead back to sign-in.

For live verification after configuring email, request a reset from a test account you control, follow the received link, and confirm the old password/session and reused link are rejected. Provider acceptance is distinct from inbox delivery; inspect delivery events in Resend when troubleshooting.
