export * as GitHostRepos from "./git-host-repos"

import { Effect, Schema } from "effect"
import { FetchHttpClient, HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http"

export interface Repo {
  readonly id: string
  readonly name: string
  readonly fullName: string
  readonly cloneUrl: string
  readonly defaultBranch: string
}

const GithubRepo = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  full_name: Schema.String,
  clone_url: Schema.String,
  default_branch: Schema.String,
})

const GitlabProject = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  path_with_namespace: Schema.String,
  http_url_to_repo: Schema.String,
  default_branch: Schema.String,
})

function request<A, I>(url: string, headers: Record<string, string>, schema: Schema.Schema<A, I>) {
  return Effect.gen(function* () {
    const http = yield* HttpClient.HttpClient
    const response = yield* http
      .execute(HttpClientRequest.get(url).pipe(HttpClientRequest.setHeaders(headers)))
      .pipe(Effect.mapError(() => new Error(`Request to ${url} failed`)))
    if (response.status < 200 || response.status >= 300)
      return yield* Effect.fail(new Error(`HTTP ${response.status} from ${url}`))
    return yield* HttpClientResponse.schemaBodyJson(Schema.Array(schema))(response).pipe(
      Effect.mapError(() => new Error(`Invalid response from ${url}`)),
    )
  })
}

// IDs are prefixed per host so a picker listing both hosts together can't collide: GitHub and
// GitLab both hand out small sequential numeric IDs of their own.
export const github = (token: string) => {
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  }
  return request("https://api.github.com/user/repos?per_page=100&sort=pushed", headers, GithubRepo).pipe(
    Effect.map((repos) =>
      repos.map(
        (repo): Repo => ({
          id: `github:${repo.id}`,
          name: repo.name,
          fullName: repo.full_name,
          cloneUrl: repo.clone_url,
          defaultBranch: repo.default_branch,
        }),
      ),
    ),
    Effect.provide(FetchHttpClient.layer),
  )
}

export const gitlab = (token: string) => {
  const headers = { Authorization: `Bearer ${token}` }
  const url = "https://gitlab.com/api/v4/projects?membership=true&per_page=100&order_by=last_activity_at"
  return request(url, headers, GitlabProject).pipe(
    Effect.map((repos) =>
      repos.map(
        (repo): Repo => ({
          id: `gitlab:${repo.id}`,
          name: repo.name,
          fullName: repo.path_with_namespace,
          cloneUrl: repo.http_url_to_repo,
          defaultBranch: repo.default_branch,
        }),
      ),
    ),
    Effect.provide(FetchHttpClient.layer),
  )
}
