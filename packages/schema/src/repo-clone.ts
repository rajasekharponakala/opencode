export * as RepoClone from "./repo-clone.js"

import { Schema } from "effect"
import { AbsolutePath, optional } from "./schema.js"

const nonEmpty = Schema.Trim.pipe(Schema.check(Schema.isNonEmpty()))

export const CloneInput = Schema.Struct({
  remote: nonEmpty.annotate({
    description: "HTTPS clone URL with no embedded credential. Pair with `token` for a private repository.",
  }),
  token: optional(Schema.String).annotate({
    description:
      "Host access token, used only to authenticate this clone. Never persisted: the server strips any " +
      "credential from the cloned repository's saved remote URL before responding.",
  }),
  branch: optional(nonEmpty),
  directory: optional(AbsolutePath).annotate({
    description: "Destination directory. Defaults to the server's data directory under repos/sessions/<remote>.",
  }),
}).annotate({ identifier: "RepoClone.CloneInput" })
export interface CloneInput extends Schema.Schema.Type<typeof CloneInput> {}

export const Info = Schema.Struct({
  directory: AbsolutePath,
}).annotate({ identifier: "RepoClone.Info" })
export interface Info extends Schema.Schema.Type<typeof Info> {}

export const HostID = Schema.Literals(["github", "gitlab"]).annotate({ identifier: "RepoClone.HostID" })
export type HostID = Schema.Schema.Type<typeof HostID>

// `available` reflects whether the server process can read a live credential from `gh`/`glab`
// right now; it never carries the token itself.
export const Host = Schema.Struct({
  id: HostID,
  available: Schema.Boolean,
}).annotate({ identifier: "RepoClone.Host" })
export interface Host extends Schema.Schema.Type<typeof Host> {}

export const Repo = Schema.Struct({
  id: nonEmpty,
  name: Schema.String,
  fullName: Schema.String,
  cloneUrl: Schema.String,
  defaultBranch: Schema.String,
}).annotate({ identifier: "RepoClone.Repo" })
export interface Repo extends Schema.Schema.Type<typeof Repo> {}
