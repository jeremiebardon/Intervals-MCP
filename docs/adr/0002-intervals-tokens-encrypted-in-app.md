# Intervals.icu access tokens are encrypted by the app, not by Supabase Vault

Intervals.icu OAuth tokens never expire and have no refresh token, so a leaked token gives lasting access to an athlete's data. We encrypt them on the server with AES-256-GCM. The key comes from an environment variable that only our servers hold. The table stores `ciphertext`, `iv`, `auth_tag` and `key_version`, in a table with no RLS policies for client roles. We rejected Supabase Vault: anyone holding the service role or a database dump can decrypt Vault secrets through `vault.decrypted_secrets`. With app-held keys, a database leak alone exposes no tokens.

## Consequences

- Any service that calls Intervals.icu for an Athlete needs the same key. Today that is only `apps/web`; `apps/agents` will need it when it stops using its single `INTERVALS_API_KEY`.
- `key_version` exists so the key can be rotated by re-encrypting rows, without a schema change.
