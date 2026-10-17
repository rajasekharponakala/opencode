import { RepoClone } from "@opencode/schema/repo-clone"
import { Schema } from "effect"
import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "effect/http-api"

const root = "/api/repo"

export class RepoCloneError extends Schema.TaggedError<RepoCloneError>()(
  "RepoCloneError",
  {
    name: Schema.Literal("RepoCloneError"),
    data: Schema.Struct({ message: Schema.String }),
  },
  { httpApiStatus: 400 },
) {}

export const RepoCloneGroup = HttpApiGroup.make("server.repo").add(
  HttpApiEndpoint.post("repo.clone", root, {
    payload: RepoClone.CloneInput,
    success: RepoClone.Info,
    error: RepoCloneError,
  }).annotateMerge(
    OpenApi.annotations({
      identifier: "repo.clone",
      summary: "Clone a repository",
      description:
        "Clone a remote repository into a new, server-managed directory, authenticating with the given token " +
        "only for the clone itself. The saved repository's remote URL never retains the token.",
    }),
  ),
)
