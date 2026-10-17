import { expect, test } from "bun:test"
import { Global } from "@opencode/util/global"
import { destinationFor, withToken } from "../src/handlers/repo-clone"

test("withToken leaves the remote unchanged without a token", () => {
  expect(withToken("https://github.com/owner/repo.git", undefined)).toBe("https://github.com/owner/repo.git")
})

test("withToken uses x-access-token for GitHub", () => {
  expect(withToken("https://github.com/owner/repo.git", "ghp_example")).toBe(
    "https://x-access-token:ghp_example@github.com/owner/repo.git",
  )
})

test("withToken uses oauth2 for GitLab", () => {
  expect(withToken("https://gitlab.com/owner/repo.git", "glpat-example")).toBe(
    "https://oauth2:glpat-example@gitlab.com/owner/repo.git",
  )
})

test("destinationFor derives a per-host, per-repo path under repos/sessions", () => {
  const global = Global.make({ repos: "/data/repos" })
  expect(destinationFor(global, "https://github.com/owner/repo.git")).toBe(
    "/data/repos/sessions/github.com/owner/repo",
  )
})

test("destinationFor handles nested GitLab group paths", () => {
  const global = Global.make({ repos: "/data/repos" })
  expect(destinationFor(global, "https://gitlab.com/group/subgroup/repo.git")).toBe(
    "/data/repos/sessions/gitlab.com/group/subgroup/repo",
  )
})
