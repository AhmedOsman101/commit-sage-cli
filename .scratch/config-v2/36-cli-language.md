## Question

Close the spec: wire the CLI surface and language — single `--model "provider/model"` flag (split first `/`, multi-segment model preserved like `9router/kc/stealth/ox-alpha`, deprecate `--provider` with warning), BCP-47 `commit.commitLanguage` store-as-given (accept `en`/`english`/`en-US`/`ja`/`jp`/`japanese` etc., `ja` and `jp` both alias Japanese, stored verbatim, `PromptService` normalizes internally for 9+ languages), shallow `config get/set` limitation for `providers.*.models` (documented, edit file directly), and finalize `ModelPreset.name` display name for future picker.

**Vertical slice complete when:**
- `generate --model 9router/kc/stealth/ox-alpha` splits first slash → provider `9router`, model `kc/stealth/ox-alpha` and passes `apiKey`/`apiType`/`reasoning` resolution from T3
- `generate --provider openai --model gpt-5` still works but warns `"--provider is deprecated, use --model provider/model"` and concatenates for one run
- `commit-sage config set commit.commitLanguage jp` + `config get commit.commitLanguage` prints `jp` (store-as-given), `config set commit.commitLanguage en-US` prints `en-US`, `commit.commitLanguage: "ja"` still prompts in Japanese
- `commit-sage config get providers.openai.models` prints note "use config edit for presets" or dumps map (either, documented)
- `commit-sage config get model` + `generation.maxPromptTokens` + `commit.maxLength` + `generation.retryDelay` all work under new names
- No `general`/`provider.type`/`maxSubjectLength`/`maxInputChars` remains; `mask typecheck` + `mask lint` + `grep -rn "general\|provider\.type" --include="*.md"` zero hits outside `adr/002`
- `config get/set` for `providers.*.models` intentionally shallow — acknowledged in `docs/specs` + CLI help

**Depends on:** T1 + T2 + T3.
