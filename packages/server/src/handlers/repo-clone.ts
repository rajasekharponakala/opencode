import path from "path"
import { Git } from "@opencode/core/git"
import { GitHostCredentials } from "@opencode/core/git-host-credentials"
import { GitHostRepos } from "@opencode/core/git-host-repos"
import { AbsolutePath } from "@opencode/core/schema"
import { FSUtil } from "@opencode/util/fs-util"
import { Global } from "@opencode/util/global"
import { Effect } from "effect"
import { HttpApiBuilder } from "effect/http-api"
import { RepoClone } from "@opencode/schema/repo-clone"
import { RepoCloneError } from "@opencode/protocol/groups/repo-clone"
import { Api } from "../api"

// Embeds the token in the URL only for the clone attempt itself; the caller never sees this
// value, and the cloned repository's saved remote is rewritten to the plain URL right after,
// so the token never persists in .git/config. GitHub's git-http backend authenticates off the
// password field regardless of username, but GitLab expects the oauth2 username specifically.
export function withToken(remote: string, token: string | undefined) {
  if (!token) return remote
  const url = new URL(remote)
  url.username = url.hostname === "gitlab.com" ? "oauth2" : "x-access-token"
  url.password = token
  return url.toString()
}

export function destinationFor(global: Global.Interface, remote: string) {
  const url = new URL(remote)
  const segments = url.pathname.replace(/\.git$/, "").split("/").filter(Boolean)
  return AbsolutePath.make(path.join(global.repos, "sessions", url.hostname, ...segments))
}

export const RepoCloneHandler = HttpApiBuilder.group(Api, "server.repo", (handlers) =>
  Effect.gen(function* () {
    const git = yield* Git.Service
    const fs = yield* FSUtil.Service
    const global = yield* Global.Service
    return handlers
      .handle(
        "repo.clone",
        Effect.fn(function* (ctx) {
          const directory = ctx.payload.directory ?? destinationFor(global, ctx.payload.remote)
          yield* fs.ensureDir(path.dirname(directory)).pipe(
            Effect.mapError(
              () => new RepoCloneError({ name: "RepoCloneError", data: { message: "Could not prepare destination directory" } }),
            ),
          )
          const repository = yield* git.repo
            .clone({ remote: withToken(ctx.payload.remote, ctx.payload.token), directory, branch: ctx.payload.branch })
            .pipe(Effect.mapError((error) => new RepoCloneError({ name: "RepoCloneError", data: { message: error.message } })))
          yield* git.remote
            .setUrl(repository, ctx.payload.remote)
            .pipe(Effect.mapError((error) => new RepoCloneError({ name: "RepoCloneError", data: { message: error.message } })))
          return { directory }
        }),
      )
      .handle(
        "repo.host.list",
        Effect.fn(function* () {
          const [github, gitlab] = yield* Effect.all([GitHostCredentials.github(), GitHostCredentials.gitlab()])
          return [
            { id: "github", available: github !== undefined },
            { id: "gitlab", available: gitlab !== undefined },
          ] satisfies RepoClone.Host[]
        }),
      )
      .handle(
        "repo.host.repos",
        Effect.fn(function* (ctx) {
          const token = yield* (ctx.params.host === "github" ? GitHostCredentials.github() : GitHostCredentials.gitlab())
          if (!token)
            return yield* Effect.fail(
              new RepoCloneError({ name: "RepoCloneError", data: { message: `No live credential for ${ctx.params.host}` } }),
            )
          return yield* (ctx.params.host === "github" ? GitHostRepos.github(token) : GitHostRepos.gitlab(token)).pipe(
            Effect.mapError((error) => new RepoCloneError({ name: "RepoCloneError", data: { message: error.message } })),
          )
        }),
      )
  }),
)
