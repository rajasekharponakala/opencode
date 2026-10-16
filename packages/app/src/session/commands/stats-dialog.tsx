import { Component, createResource, For, Show } from "solid-js"
import { Dialog, DialogBody, DialogHeader, DialogTitle } from "@opencode/ui/dialog"
import { TokenUsage } from "@opencode/schema/token-usage"
import { useLanguage } from "@/runtime/i18n/language"
import { useServer } from "@/runtime/server/current"

const formatCompact = (value: number) =>
  new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value)

export const DialogStats: Component = () => {
  const language = useLanguage()
  const server = useServer()

  const [stats] = createResource(() => {
    const now = new Date()
    return server.ctx.sdk.api.session.stats({
      from: new Date(now.getFullYear(), 0, 1).getTime(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      tools: "none",
    })
  })

  const metrics = () => {
    const value = stats()
    if (!value) return []
    return [
      { label: language.t("command.session.stats.tokens"), value: formatCompact(TokenUsage.total(value.tokens)) },
      { label: language.t("command.session.stats.streak"), value: formatCompact(value.streak) },
      { label: language.t("command.session.stats.activeDays"), value: formatCompact(value.activeDays) },
      { label: language.t("command.session.stats.sessions"), value: formatCompact(value.sessions) },
    ]
  }

  return (
    <Dialog>
      <DialogHeader>
        <DialogTitle>{language.t("command.session.stats")}</DialogTitle>
      </DialogHeader>
      <DialogBody>
        <Show when={stats()} fallback={<div class="p-4 text-text-weak">{language.t("common.loading")}</div>}>
          <div class="flex flex-col gap-3 p-4">
            <For each={metrics()}>
              {(metric) => (
                <div class="flex items-center justify-between text-sm">
                  <span class="text-text-weak">{metric.label}</span>
                  <span class="font-medium tabular-nums">{metric.value}</span>
                </div>
              )}
            </For>
          </div>
        </Show>
      </DialogBody>
    </Dialog>
  )
}
