import { describe, expect, test } from "bun:test"
import { OpenCode } from "@opencode/client/promise"
import { createData } from "@opencode/client/solid"
import { createRoot } from "solid-js"
import { cloneRepo } from "./clone"

describe("repo clone", () => {
  test("clones the remote and syncs the resulting location", async () => {
    const project = { id: "proj_cloned", directory: "/cloned", canonical: "/cloned" }
    const requests: Request[] = []

    const api = OpenCode.make({
      baseUrl: "http://localhost:3000",
      fetch: Object.assign(
        async (input: RequestInfo | URL, init?: RequestInit) => {
          const request = new Request(input, init)
          requests.push(request)

          if (request.method === "POST") return Response.json({ directory: "/cloned" })

          return Response.json({ directory: new URL(request.url).searchParams.get("location[directory]"), project })
        },
        { preconnect() {} },
      ),
    })

    await createRoot(async (dispose) => {
      const data = createData({
        api: () => api,
        directory: "/cloned",
        event: { on: () => () => {}, listen: () => () => {} },
      })

      try {
        expect(
          await cloneRepo({ api, data, remote: "https://github.com/owner/repo.git", token: "ghp_example" }),
        ).toBe("/cloned")
        const clone = requests.find((request) => request.method === "POST")
        expect(clone?.url).toBe("http://localhost:3000/api/repo")
        expect(await clone?.json()).toEqual({ remote: "https://github.com/owner/repo.git", token: "ghp_example" })
        expect(data.location.info({ directory: "/cloned" })).toEqual({ directory: "/cloned", project })
      } finally {
        dispose()
      }
    })
  })
})
