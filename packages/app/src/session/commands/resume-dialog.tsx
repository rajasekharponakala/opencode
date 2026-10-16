import { Component } from "solid-js"
import { useNavigate } from "@solidjs/router"
import { useDialog } from "@opencode/ui/context/dialog"
import { Dialog, DialogBody, DialogHeader, DialogTitle } from "@opencode/ui/dialog"
import { useLanguage } from "@/runtime/i18n/language"
import { useServer } from "@/runtime/server/current"
import { sessionHref } from "@/shell/routes/session"
import { createServerSessionEntries, type CommandPaletteEntry } from "@/shell/commands/palette"
import { CommandPaletteView } from "@/shell/commands/dialog"

export const DialogResume: Component = () => {
  const navigate = useNavigate()
  const dialog = useDialog()
  const language = useLanguage()
  const server = useServer()
  const ctx = server.ctx

  const sessions = createServerSessionEntries({
    server: server.key,
    opened: ctx.projects.list,
    stored: () => ctx.sync.data.project,
    load: (search, signal) => ctx.sdk.api.session.list({ parentID: null, search, limit: 50 }, { signal }),
    get: (sessionID, signal) => ctx.sdk.api.session.get({ sessionID }, { signal }),
    untitled: () => language.t("command.session.new"),
    category: () => language.t("command.category.session"),
    recentCategory: () => language.t("palette.group.recentSessions"),
  })

  const select = (item: CommandPaletteEntry | undefined) => {
    if (item?.type !== "session" || !item.sessionID) return
    dialog.close()
    navigate(sessionHref(server.key, item.sessionID))
  }

  return (
    <Dialog>
      <DialogHeader>
        <DialogTitle>{language.t("command.session.resume")}</DialogTitle>
      </DialogHeader>
      <DialogBody>
        <CommandPaletteView
          placeholder={language.t("common.search.placeholder")}
          items={() => []}
          sources={[sessions]}
          highlight={() => {}}
          select={select}
          close={() => dialog.close()}
        />
      </DialogBody>
    </Dialog>
  )
}
