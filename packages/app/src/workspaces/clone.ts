import type { OpenCodeClient } from "@opencode/client/promise"
import type { Data } from "@opencode/client/solid"

export async function cloneRepo(input: {
  api: Pick<OpenCodeClient, "repo">
  data: Pick<Data, "location">
  remote: string
  token?: string
  branch?: string
}) {
  const created = await input.api.repo.clone({ remote: input.remote, token: input.token, branch: input.branch })

  // Populate the client cache before the destination session mounts.
  await input.data.location.syncInfo({ directory: created.directory })

  return created.directory
}
