import { expect, test } from "bun:test"
import { extractGithubToken, extractGitlabToken } from "../src/git-host-credentials"

test("extractGithubToken trims gh auth token's single-line output", () => {
  expect(extractGithubToken("ghp_exampletoken123\n")).toBe("ghp_exampletoken123")
})

test("extractGithubToken returns empty for blank output", () => {
  expect(extractGithubToken("\n")).toBe("")
})

test("extractGitlabToken pulls the token out of glab's full status output", () => {
  const stdout = [
    "gitlab.com",
    "  ✓ Logged in to gitlab.com as example-user (oauth_token)",
    "  ✓ Git operations for gitlab.com configured to use https protocol.",
    "  ✓ API calls for gitlab.com are made over https protocol",
    "  ✓ Token: glpat-exampletoken123",
    "",
  ].join("\n")
  expect(extractGitlabToken(stdout)).toBe("glpat-exampletoken123")
})

test("extractGitlabToken returns empty when not logged in", () => {
  expect(extractGitlabToken("gitlab.com\n  x Not logged in\n")).toBe("")
})
