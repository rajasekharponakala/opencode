import { Component, createResource } from "solid-js"
import type { WorktreeDirectory } from "@opencode/client/promise"
import { useDialog } from "@opencode/ui/context/dialog"
import { Dialog, DialogBody, DialogHeader, DialogTitle } from "@opencode/ui/dialog"
import { List } from "@opencode/ui/list"
import { getFilename, sameDirectory } from "@opencode/util/path"
import { useLanguage } from "@/runtime/i18n/language"
import { useServer } from "@/runtime/server/current"
import { showToast } from "@/shell/notifications/toast"

export const DialogWorktrees: Component<{ sessionID: string; projectID: string; directory: string }> = (props) => {
  const language = useLanguage()
  const dialog = useDialog()
  const server = useServer()

  const [worktrees] = createResource(
    () => props.projectID,
    async (projectID) => {
      await server.ctx.sync.worktrees.refresh(projectID)

      return (await server.ctx.sync.worktrees.list(projectID)) ?? []
    },
    { initialValue: [] },
  )

  const select = (item: WorktreeDirectory | undefined) => {
    if (!item || sameDirectory(item.directory, props.directory)) return
    dialog.close()
    server.ctx.sdk.api.session
      .move({ sessionID: props.sessionID, directory: item.directory })
      .catch(() => showToast({ variant: "error", title: language.t("session.location.moveFailed") }))
  }

  return (
    <Dialog>
      <DialogHeader>
        <DialogTitle>{language.t("command.session.worktrees")}</DialogTitle>
      </DialogHeader>
      <DialogBody>
        <List
          class="flex-1 px-3 min-h-0 [&_[data-slot=list-scroll]]:flex-1 [&_[data-slot=list-scroll]]:min-h-0"
          search={{ placeholder: language.t("common.search.placeholder"), autofocus: true }}
          emptyMessage={language.t("dialog.worktrees.empty")}
          key={(x) => x.directory}
          items={() => worktrees.latest}
          filterKeys={["directory"]}
          onSelect={select}
        >
          {(item) => <span class="truncate flex-1 min-w-0 text-left font-normal">{getFilename(item.directory)}</span>}
        </List>
      </DialogBody>
    </Dialog>
  )
}
