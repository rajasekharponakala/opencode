import { For, Show, createSignal } from "solid-js"
import { createStore } from "solid-js/store"
import createPresence from "solid-presence"
import { Icon as IconV2 } from "@opencode-ai/ui/v2/icon"
import { useLanguage } from "@/context/language"
import { Persist, persisted } from "@/utils/persist"

const dismissalDuration = 24 * 60 * 60 * 1000

/**
 * Curated snapshot of the featured entries in
 * packages/console/app/src/component/go-models.ts. The app package has no
 * live fetch path to console yet, so this list is static; keep it in sync
 * by hand when the Go catalog changes.
 */
const freeModels = [
  { id: "mimo-v2.6-flash", name: "MiMo-V2.6-Flash", requests: 30100 },
  { id: "deepseek-flash", name: "DeepSeek V4.1 Flash", requests: 26000 },
  { id: "gpt-6-luna", name: "GPT 6 Luna", requests: 4230 },
] as const

export function FreeModelsPanel() {
  const language = useLanguage()
  const [persistedState, setPersistedState, , persistedReady] = persisted(
    Persist.global("new-session.free-models-panel"),
    createStore({ dismissedAt: 0 }),
  )
  const visible = () => persistedReady() && Date.now() - persistedState.dismissedAt >= dismissalDuration
  const [ref, setRef] = createSignal<HTMLDivElement>()
  const presence = createPresence({ show: visible, element: () => ref() ?? null })

  return (
    <Show when={presence.present()}>
      <div
        ref={setRef}
        data-component="free-models-panel"
        data-visible={visible()}
        class="flex h-fit w-[240px] shrink-0 flex-col gap-3 rounded-[10px] bg-v2-background-bg-deep p-4 transition-[opacity,transform] duration-[250ms] ease-[cubic-bezier(0.215,0.61,0.355,1)] motion-reduce:transition-none"
        classList={{ "data-[visible=false]:animate-out fade-out slide-out-to-right-4": true }}
      >
        <div class="flex items-center justify-between">
          <span class="text-[13px] font-medium text-v2-text-text-base">{language.t("home.freeModels.title")}</span>
          <button
            type="button"
            class="flex size-5 shrink-0 items-center justify-center rounded-[4px] text-v2-icon-icon-muted transition-colors duration-150 ease-in-out hover:bg-v2-overlay-simple-overlay-hover hover:text-v2-icon-icon-base focus-visible:bg-v2-overlay-simple-overlay-hover focus-visible:text-v2-icon-icon-base focus-visible:outline-none"
            aria-label={language.t("common.dismiss")}
            onClick={() => setPersistedState("dismissedAt", Date.now())}
          >
            <IconV2 name="xmark-small" />
          </button>
        </div>
        <ul class="flex flex-col gap-2">
          <For each={freeModels}>
            {(model) => (
              <li class="flex items-center justify-between gap-2 text-[13px] text-v2-text-text-muted">
                <span class="truncate">{model.name}</span>
                <span class="shrink-0 tabular-nums text-v2-text-text-faint">
                  {model.requests.toLocaleString()} {language.t("home.freeModels.requestsSuffix")}
                </span>
              </li>
            )}
          </For>
        </ul>
      </div>
    </Show>
  )
}
