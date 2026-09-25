# RFC: BYO Instance — connect a repo to a running opencode instance

## Problem

opencode is local-first: `packages/server` only ever talks to one machine, and
`packages/console` (the hosted SaaS) is scoped to auth/billing/Zen model
proxying. There is no way to:

- Connect a GitHub repo to an opencode instance from the browser
- Register an already-running `opencode serve` (yours, a teammate's, or a
  community host's) against a workspace
- Start a session against a chosen repo/branch and have it come back as a
  pushed branch or PR

This is phase 1 of a larger "hosted sessions" effort. It deliberately excludes
provisioning: no opencode-managed containers, no GitLab, no public instance
directory. Those are later phases — see Non-goals.

## Proposal — `feat(console): BYO instance registry + GitHub connect`

### Data model (`packages/console/core`)

Two new tables, both scoped to the existing `WorkspaceTable`:

- `github_connection` — `id`, `workspace_id`, `account_id`, encrypted GitHub
  token (prefer a GitHub App installation token over a PAT — short-lived,
  narrower scope, revocable from GitHub's side), `installation_id`,
  `time_created`, `time_deleted`.
- `instance` — `id`, `workspace_id`, `label`, `url`, `token_hash` (the
  instance's own auth token, hashed at rest), `last_seen_at`,
  `time_created`, `time_deleted`.

Follow the existing `snake_case` Drizzle convention (see
`packages/console/core/src/schema/workspace.sql.ts`).

### GitHub connect (`packages/console/app/src/routes/auth`)

Add a `github` OAuth flow alongside the existing `openauthjs` client in
`context/auth.ts`. On callback, store the token in `github_connection`
against the current `Actor`'s workspace. Repo listing is a thin proxy to
GitHub's `/user/repos` (or installation repos if using a GitHub App) — no
new abstraction needed for one provider.

### Instance registration

- CLI: `opencode connect <console-url>` — registers the local instance's URL
  + a freshly minted token against the workspace named by the logged-in
  session, reusing the auth token flow the `#41392` remote-pairing work
  already added under `packages/opencode/src/remote`.
- Console UI: workspace page lists registered instances (label, URL,
  last-seen), lets you revoke one (soft-delete + token invalidation).

### Session bridge (`packages/opencode/src/server/routes/instance/httpapi`)

Add a `connect` group (pattern: `HttpApiBuilder.group(InstanceHttpApi, ...)`,
per the existing `AGENTS.md` in this directory) with one handler that takes
`{ repo, branch, token }` and does the clone + session start **on the
instance itself** — the console never touches source code, it only mediates
the handshake and forwards the GitHub token for the duration of the request.
This keeps the trust boundary the same as today: your code only ever runs on
an instance you control.

### Push-back

Session completion pushes the branch and opens a PR using the same forwarded
GitHub token, from inside the instance — no new git logic, this reuses
whatever the instance would do for a local `git push` today.

## Non-goals (later phases)

- **Phase 2 — opencode-managed provisioning**: opencode itself spins up an
  ephemeral container per session (what `packages/containers`' empty build
  script is presumably for). This needs a scheduler, image, and idle-reap
  policy and is a separate RFC.
- **Phase 2 — GitLab**: same connector shape as GitHub, added once the
  provider abstraction has a second implementation to justify it.
- **Phase 1.5 — community instance directory**: opt-in public listing of
  instances (e.g. "official demo", volunteer-hosted). Pure UI/registry work
  once phase 1's `instance` table exists.

## Verification

- `opencode connect <console-url>` registers the instance; it shows up in
  the workspace UI with a live `last-seen`.
- Connecting GitHub, picking a repo/branch, and starting a session clones
  and runs on the registered instance, not on console infra.
- Revoking an instance or the GitHub connection immediately invalidates the
  forwarded token; a session already running is unaffected (token was
  scoped to that request).

## Issue First

This doc is the GitHub issue body before any PR, per this repo's own
convention (see the earlier `RC_PROPOSAL.md` for the LAN remote-control
RFC). Phase 1 ships as a small, focused PR: the two tables, the GitHub
callback route, `opencode connect`, and the one new httpapi handler —
no UI polish, no phase 2 pieces.
