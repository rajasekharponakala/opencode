import { createMemo, createSignal } from "solid-js"
import type { RepoClone } from "@opencode/schema/repo-clone"
import { useDirectoryPicker } from "@/workspaces/selection/picker"
import { useGlobal, useServerCtx } from "@/runtime/server/runtime"
import { useServerSDK } from "@/runtime/server/client"
import { serverName, ServerConnection, useServers } from "@/runtime/server/registry"
import { useWorkspaceLocation } from "@/workspaces/location"
import { workspaceSelectionDestination } from "@/workspaces/paths"
import { useTabs } from "@/shell/tabs/tabs"
import { useLanguage } from "@/runtime/i18n/language"
import { showToast } from "@/shell/notifications/toast"
import { errorMessage } from "@/shell/layout/helpers"
import { cloneRepo } from "@/workspaces/clone"
import type { PromptCloneRepoState, PromptProjectControls } from "./selector"

export function createComposerProjectControls(props: { draftId: string; worktree: () => string }) {
  const language = useLanguage()
  const servers = useServers()
  const serverSDK = useServerSDK()
  const location = useWorkspaceLocation()
  const tabs = useTabs()
  const global = useGlobal()
  const pickDirectory = useDirectoryPicker()
  const projectServer = () => serverSDK.server
  const projectServerCtx = useServerCtx(projectServer)

  const projects = createMemo(() => {
    if (servers.list.length <= 1) return projectServerCtx().projects.list()

    return servers.list.flatMap((connection) => {
      const server = { key: ServerConnection.key(connection), name: serverName(connection) }

      return global
        .ensureServerCtx(connection)
        .projects.list()
        .map((project) => ({ ...project, server }))
    })
  })

  const selectProject = (worktree: string, serverKey?: string) => {
    const connection = serverKey
      ? servers.list.find((connection) => ServerConnection.key(connection) === serverKey)
      : projectServer()

    if (!connection) return

    const target = global.ensureServerCtx(connection)
    target.projects.open(worktree)
    target.projects.touch(worktree)
    tabs.updateDraft(props.draftId, {
      server: ServerConnection.key(connection),
      directory: worktree,
      worktree: workspaceSelectionDestination(props.worktree(), location().directory),
      branch: undefined,
    })
  }

  const addProject = (title: string, serverKey?: string) => {
    const connection = serverKey
      ? servers.list.find((connection) => ServerConnection.key(connection) === serverKey)
      : projectServer()

    if (!connection) return
    pickDirectory({
      server: connection,
      location: ServerConnection.key(connection) === ServerConnection.key(projectServer()) ? location().ref : undefined,
      title,
      onSelect: (result) => {
        const directory = Array.isArray(result) ? result[0] : result

        if (directory) selectProject(directory, serverKey)
      },
    })
  }

  // Hosts are detected live from the project server's `gh`/`glab` CLI credentials each time the
  // menu opens; nothing here is cached across sessions or persisted.
  const [hosts, setHosts] = createSignal<RepoClone.Host[]>([])
  const [repoState, setRepoState] = createSignal<Partial<Record<RepoClone.HostID, PromptCloneRepoState>>>({})

  const refreshCloneHosts = () => {
    projectServerCtx()
      .sdk.api.repo.host.list()
      .then(setHosts)
      .catch(() => setHosts([]))
  }

  const loadCloneRepos = (host: RepoClone.HostID) => {
    if (repoState()[host]) return
    setRepoState((current) => ({ ...current, [host]: { loading: true, failed: false, repos: [] } }))

    projectServerCtx()
      .sdk.api.repo.host.repos({ host })
      .then((repos) => setRepoState((current) => ({ ...current, [host]: { loading: false, failed: false, repos } })))
      .catch(() => setRepoState((current) => ({ ...current, [host]: { loading: false, failed: true, repos: [] } })))
  }

  const cloneCatalogRepo = (repo: RepoClone.Repo) => {
    const connection = projectServer()
    const ctx = projectServerCtx()

    cloneRepo({ api: ctx.sdk.api, data: ctx.data, remote: repo.cloneUrl, branch: repo.defaultBranch })
      .then((directory) => {
        ctx.projects.open(directory)
        ctx.projects.touch(directory)
        tabs.updateDraft(props.draftId, {
          server: ServerConnection.key(connection),
          directory,
          worktree: workspaceSelectionDestination(props.worktree(), location().directory),
          branch: undefined,
        })
      })
      .catch((error) => {
        showToast({
          title: language.t("prompt.toast.repoCloneFailed.title"),
          description: errorMessage(error, language.t("common.requestFailed")),
        })
      })
  }

  return createMemo<PromptProjectControls>(() => ({
    available: projects(),
    directory: location().directory,
    projectID: location().current?.project.id,
    server: servers.list.length > 1 ? ServerConnection.key(projectServer()) : undefined,
    select: selectProject,
    add: addProject,
    clone: {
      hosts: hosts().filter((host) => host.available).map((host) => host.id),
      refreshHosts: refreshCloneHosts,
      repos: (host) => repoState()[host],
      loadRepos: loadCloneRepos,
      clone: cloneCatalogRepo,
    },
  }))
}
