import { describe, expect, test } from "bun:test"
import { Schema } from "effect"
import { RepoClone } from "../src/repo-clone.js"

describe("RepoClone.CloneInput", () => {
  test("omits an unset token when encoded", () => {
    const value = Schema.decodeUnknownSync(RepoClone.CloneInput)({ remote: "https://github.com/owner/repo.git" })
    expect(Schema.encodeSync(RepoClone.CloneInput)(value)).toEqual({ remote: "https://github.com/owner/repo.git" })
  })

  test("preserves an explicit token and branch", () => {
    const input = { remote: "https://github.com/owner/repo.git", token: "ghp_example", branch: "main" }
    expect(Schema.encodeSync(RepoClone.CloneInput)(Schema.decodeUnknownSync(RepoClone.CloneInput)(input))).toEqual(
      input,
    )
  })
})

test("RepoClone.HostID accepts only github and gitlab", () => {
  expect(Schema.decodeUnknownSync(RepoClone.HostID)("github")).toBe("github")
  expect(Schema.decodeUnknownSync(RepoClone.HostID)("gitlab")).toBe("gitlab")
  expect(() => Schema.decodeUnknownSync(RepoClone.HostID)("bitbucket")).toThrow()
})

test("RepoClone.Host round-trips without carrying a credential field", () => {
  const value = Schema.decodeUnknownSync(RepoClone.Host)({ id: "github", available: true })
  expect(Schema.encodeSync(RepoClone.Host)(value)).toEqual({ id: "github", available: true })
  expect(RepoClone.Host.fields).not.toHaveProperty("token")
})

test("RepoClone.Repo round-trips the catalog fields used to clone", () => {
  const input = {
    id: "github:1",
    name: "repo",
    fullName: "owner/repo",
    cloneUrl: "https://github.com/owner/repo.git",
    defaultBranch: "main",
  }
  expect(Schema.encodeSync(RepoClone.Repo)(Schema.decodeUnknownSync(RepoClone.Repo)(input))).toEqual(input)
})
