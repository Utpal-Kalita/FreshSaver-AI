# FreshSaver Security Notes

## Security Posture

FreshSaver is a hackathon MVP, not a production security certification. It has
meaningful controls around authentication, store scoping, expiry, server-side price
validation, and secret-protected cron execution. It also uses a Supabase service
role in server routes, which means every route-level authorization check is a
critical trust boundary because that client bypasses RLS.

Do not connect real payment credentials, production customer data, or safety-critical
inventory processes until the limitations in this document are remediated and
independently tested.

## Immediate Secret Rotation Warning

If any real secret has ever been committed, pasted into an issue or chat, printed in
logs, included in a screenshot, exposed during screen sharing, or deployed to an
untrusted preview, assume it is compromised. Removing it from the current file is
not sufficient because it may remain in Git history, caches, logs, or recordings.

Immediately revoke and rotate the affected value at its provider:

- `SUPABASE_SERVICE_ROLE_KEY`: rotate Supabase signing/service credentials and
  review database and auth logs.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: rotate if needed, then verify RLS remains the
  actual authorization control.
- `CRON_SECRET`: replace with a new high-entropy value and update Vercel.
- `BREVO_API_KEY`: revoke, issue a least-privilege replacement, and review sends.
- `GEMINI_API_KEY`: revoke, restrict the replacement, and review provider usage.
- Any test password shown in documentation or a demo: change it and invalidate
  active sessions before exposing the deployment.

After rotation, remove the leaked value from logs and history using an approved
incident process, redeploy all environments, and verify the old value no longer
works. Never treat placeholder values in `.env.example` as usable credentials.

## Environment Handling

Browser-visible configuration:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_STORE_URL`
- `NEXT_PUBLIC_MAP_TILE_URL`

Every `NEXT_PUBLIC_` value is bundled for or otherwise available to the browser.
The Supabase anon key is an identifier with limited database authority, not a
server secret. Its safety depends on correct grants, views, and RLS policies.

Server-only secrets:

- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`
- `BREVO_API_KEY`
- `GEMINI_API_KEY`

Rules:

- Store local values in an ignored `.env.local`, never in source or documentation.
- Store deployed values in Vercel environment settings with separate development,
  preview, and production values.
- Do not prefix a secret with `NEXT_PUBLIC_` or import server-only modules into
  client components.
- Scope provider keys to the minimum product, sender, origin, and quota possible.
- Use separate Supabase and provider projects for demos and production.
- Rotate periodically and on every suspected disclosure or team-member departure.
- Prevent logs from recording authorization headers, cookies, tokens, raw CSV data,
  customer emails, or provider response bodies containing sensitive data.
- Validate required environment variables at server startup in production rather
  than relying on non-null assertions.

`GEMINI_API_KEY` is used only by the server-side merchandising adapter. Gemini
receives product and model evidence, never customer identity, email, phone, or
subscription records. The deterministic policy selects and constrains the price
before Gemini is called, so generated output cannot alter pricing or safety rules.

`DEMAND_MODEL_API_KEY` authenticates server-to-server requests to the XGBoost
inference service. Keep the service private where possible, rotate the key on
exposure, and never use a `NEXT_PUBLIC_` prefix for either AI credential.

## Trust Boundaries

```text
[Untrusted browser]
  | public pages, cookies, CSV input, cart and order request
  v
[Next.js server boundary]
  | verifies Supabase user and store assignment
  | validates input and decides whether service role may be used
  v
[Supabase trust boundary]
  | Auth, PostgreSQL, RLS, functions, object storage
  +----> [Brevo email boundary]

[Vercel Cron]
  | Authorization: Bearer CRON_SECRET
  v
[Dedicated cron route] --> [scan engine] --> [Supabase]

[/demo in browser]
  | embedded synthetic data and local state only
  +----> [local recommender execution]
```

### Browser Boundary

Treat all browser data as attacker-controlled, including URL parameters, cart
contents, product IDs, SKUs, quantities, CSV filenames, CSV rows, and displayed
payment fields. UI route guards improve navigation but are not authorization.

The current order route correctly ignores client-submitted prices and re-reads the
store product, active state, expiry state, stock, and current database price. It
must also reject non-integer or non-positive quantities explicitly before production.

The mock card form is presentation-only. Its card fields remain in React state and
are not included in the `/api/orders` request. Do not add logging or persistence for
those fields. Replace the form with a hosted PCI provider before real payments.

### Next.js Server Boundary

`createServiceClient()` uses `SUPABASE_SERVICE_ROLE_KEY` and bypasses RLS. It is
appropriate only after a server route has authenticated the caller, checked the
required role, resolved tenant ownership server-side, and validated every object
being accessed. Never accept `store_id` as proof of authorization.

Current strengths:

- Supabase `auth.getUser()` validates sessions server-side.
- Store-admin assignment is resolved from `store_admins`.
- Manual scan execution passes the resolved store ID to the scan engine.
- Store scan detail and order mutation check store ownership.
- Cron refuses to run when `CRON_SECRET` is absent and requires exact bearer match.
- Uppercase path variants are normalized by the Next.js proxy checks.

Current gaps to remediate:

- Generic `GET /api/scan` authenticates store admins but currently uses the service
  role to return up to 50 scan logs without filtering by their store.
- `/api/customers` requires authentication but does not require super-admin or
  store-admin authorization before listing or upserting customer records with the
  service role.
- Super-admin authorization relies on a hard-coded email address. Production should
  use immutable role claims or a dedicated role table with audited administration.
- Authorization logic is distributed across proxy, pages, and handlers. A central
  policy layer and negative integration tests are needed.
- No explicit application rate limit is documented for login-adjacent, import,
  scan, order, customer, or email operations.
- CSRF assumptions and cookie attributes need a deployment-level review for every
  state-changing route.

### Supabase Boundary

Apply migrations 001 through 008 in order and review the final effective policies,
not an individual migration in isolation. Migration 006 removes broad legacy admin
policies for several audit tables and adds store-specific read policies. Service-role
queries still bypass every policy.

Use the public active-product view and least-privilege grants for marketplace reads.
Do not expose raw product rows containing expiry and internal recommendation data
unless the customer experience explicitly requires them.

`SECURITY DEFINER` functions in migration 006 set `search_path = public`, revoke
public execution, and grant execution to `service_role`. Preserve those restrictions
and audit future functions for object ownership, argument validation, and tenant
checks.

### External Provider Boundary

Brevo receives customer email, name, product/store context, and rendered HTML. This
is a data processor boundary. Configure a verified sender, least-privilege key,
retention terms, consent records, suppression behavior, and incident contacts.

Current email HTML interpolates database values. Escape customer, product, store,
address, SKU, and URL values or use a safe template system before accepting
untrusted merchant content in production. Keep the existing category preference
check and deduplication, but add frequency limits and complete unsubscribe testing.

## Tenant Isolation

The tenant key is `store_id`.

Implemented paths include store-scoped CSV upsert, product views, manual scan
execution, scan detail, merchant dashboard data, email audit fields, orders, and
order transitions. SKU uniqueness is per store.

Required verification before every release:

1. Create Store A and Store B with separate admins.
2. Give both stores the same SKU.
3. Verify each admin can import, view, scan, and order-manage only their store.
4. Attempt direct API access to the other store's product, scan, upload log, email
   log, and order IDs.
5. Verify customer endpoints expose only the signed-in customer's orders.
6. Repeat with altered case paths, stale cookies, deleted assignments, and disabled
   stores.

## CSV And Object Storage

Current controls include store-admin authorization, `.csv` extension checking, a
5 MB request limit, a 10,000-row parser limit, required-column validation, date and
number validation, duplicate-SKU detection, and row-level errors.

Production additions:

- Validate MIME and file signature rather than extension alone.
- Prefix storage objects with an immutable tenant ID and random object ID; do not
  rely on the user filename as an object path.
- Sanitize filenames and neutralize spreadsheet formulas in exported error reports.
- Define private-bucket access, encryption, retention, deletion, and legal policy.
- Scan uploads for malicious content and prevent stored files from being served as
  active browser content.
- Avoid returning database/provider internals in import error messages.

Storage archival is currently best effort. An upload can continue if object storage
fails, so the presence of an upload log does not guarantee the source CSV was
archived. The UI and audit process must represent that distinction.

## Orders, Inventory, And Payments

Current order creation revalidates product state and database price, but the order,
item inserts, and per-item stock decrements are separate operations. The decrement
RPC is conditional, yet failures are logged and do not roll back the order. Two
concurrent requests can therefore create inconsistent order or stock outcomes.

Before real commerce:

- Use one transactional database function for validation, reservation, order, and
  item creation.
- Validate quantity type and bounds server-side.
- Add an idempotency key unique to customer and checkout attempt.
- Define reservation expiry, cancellation restock, and payment compensation.
- Lock or conditionally update all products and fail the transaction as a unit.
- Calculate currency with database numeric/integer minor units and explicit rules.
- Integrate a hosted PCI-compliant payment page and verify signed webhooks.
- Do not mark an order paid based only on a browser redirect.

## Recommendation And Food Safety

FreshSaver's expiry control uses the recorded date. It cannot detect recalls,
temperature abuse, damaged packaging, labeling errors, or jurisdiction-specific
sale restrictions. A recommendation is not a declaration that food is safe.

- Keep recall and disposal blocks independent from pricing.
- Restrict who can edit expiry, stock, and manual prices.
- Audit edits and manager overrides.
- Require human review during pilot operation.
- Fail closed for invalid dates and unavailable product state.
- Monitor unusual recommendation changes and low-history fallback use.

## Logging And Privacy

Data minimization rules:

- Log stable internal IDs where possible, not customer email or raw tokens.
- Do not log request cookies, authorization headers, card fields, or full CSV rows.
- Separate operational logs from immutable recommendation evidence.
- Define retention and deletion for customer, order, CSV, email, and audit records.
- Protect exports and support data-subject access/deletion obligations as applicable.
- Alert on repeated authorization failures, cross-store attempts, import spikes,
  scan failures, email anomalies, and service-role misuse.

Campaign attribution must remain honest: a redemption or order associated with an
offer is not necessarily caused by the campaign. Only a suitable experiment can
support an incremental-sales claim.

## Credential-Free Demo Isolation

`/demo` contains embedded synthetic products, synthetic forecast evidence,
synthetic shopper preferences, and local redemption state. It does not require
Supabase or Brevo and does not send email, create orders, or persist campaign data.

Keep this path isolated:

- Never replace synthetic records with production exports.
- Never add secrets to browser code to make the demo appear connected.
- Keep the synthetic label visible in screenshots and recordings.
- Describe campaign sales as simulated attributed value, never incremental sales.

## Release Gate

Do not approve a production launch until:

- Secrets are inventoried, scoped, rotated, and absent from repository history.
- Two-store negative authorization tests pass for every service-role route.
- Scan and customer endpoint gaps listed above are fixed.
- Order creation and stock reservation are transactional and idempotent.
- Real payment uses a compliant provider and verified webhooks.
- Email content is escaped and consent/unsubscribe behavior is verified.
- RLS policies and grants are reviewed from a clean migration deployment.
- Rate limits, CSRF/CSP controls, monitoring, backups, restore tests, and incident
  response are in place.
- A food-safety owner approves operational controls outside the pricing model.
