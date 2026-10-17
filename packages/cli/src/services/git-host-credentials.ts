export * as GitHostCredentials from "./git-host-credentials"

import { Effect } from "effect"
import { ChildProcess } from "effect/process"
import { AppProcess } from "@opencode/util/process"

// Reuses whatever token the user already has from logging into these CLIs, the same way
// Claude Code's `/web-setup` reuses a local `gh` token instead of running its own OAuth flow.
// Read live each call rather than cached or persisted: these CLIs own token refresh and
// revocation, and opencode never needs to store a git host credential of its own.

export function extractGithubToken(stdout: string) {
  return stdout.trim()
}

// `glab auth status --show-token` prints full status text with the token inline, unlike
// `gh auth token`'s single-line output, so the token has to be pulled out of a larger match.
export function extractGitlabToken(stdout: string) {
  return /Token:\s*(\S+)/.exec(stdout)?.[1] ?? ""
}

const read = Effect.fn("GitHostCredentials.read")(function* (command: string[], extract: (stdout: string) => string) {
  const process = yield* AppProcess.Service
  const result = yield* process
    .run(ChildProcess.make(command[0], command.slice(1)), { timeout: "5 seconds", maxOutputBytes: 10_000 })
    .pipe(Effect.orElseSucceed(() => undefined))
  if (!result || result.exitCode !== 0) return undefined
  const token = extract(result.stdout.toString("utf8"))
  return token.length > 0 ? token : undefined
})

export const github = () => read(["gh", "auth", "token"], extractGithubToken)

export const gitlab = () => read(["glab", "auth", "status", "--show-token"], extractGitlabToken)
