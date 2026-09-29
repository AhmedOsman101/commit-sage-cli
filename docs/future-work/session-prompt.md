# Session Purpose: CLI Feature-Parity Research

> Reusable prompt that captures the intent, scope, and constraints of the research session that produced the documents in `docs/future-work/`.

---

## Prompt

Analyze the current `commit-sage` CLI against both VS Code extension codebases to identify feature gaps, architecture divergence, and a prioritized adoption plan.

### Repositories

| Repo          | Path                              | Ref                 | Scale                                                |
| ------------- | --------------------------------- | ------------------- | ---------------------------------------------------- |
| CLI (rewrite) | `~/work/TS/commit-sage`           | current             | 11 providers, 6 formats, 4 languages, subcommand CLI |
| VS Code (old) | `~/work/cloned/CommitSage`        | `56d0bdb` (v2.2.13) | 33 files, 338 nodes, 830 edges                       |
| VS Code (new) | `~/work/forks/commit-sage-vscode` | `6d8bc4e` (v3.3.3)  | 168 files, 1,537 nodes, 5,747 edges                  |

Use `codegraph_explore` for symbol-level retrieval. Initialize `.codegraph/` in each external repo first (it does not exist by default).

### Deliverables

Produce markdown in `docs/future-work/` only:

1. **Feature gap matrix** — every capability in the VS Code extensions, marked present/absent in the CLI, with effort and risk.
2. **Architecture comparison** — service layout, error handling, provider abstraction, config layering, cancellation model. State what to adopt and what to reject.
3. **Provider catalog** — union of all providers across the three repos, with config schema, auth model, and free-tier availability.
4. **Format catalog** — union of all commit formats and languages, template structure, prompt-construction contract.
5. **Roadmap** — phased plan with version targets, dependencies, effort estimates, release strategy, risk register.
6. **Domain model** — ubiquitous language: entities, config domain, provider domain, format domain, workflow, error types, service interfaces, invariants.

### Constraints

- **Markdown only.** No code changes, no implementation, no new source files.
- **`lib-result` is non-negotiable.** Any architectural recommendation must preserve the `Result<T, Error>` pattern.
- **No telemetry, no walkthroughs, no webview.** VS Code UI concerns are out of scope.
- **Do not drop existing CLI providers.** Additions only.
- **Adopt architecture opportunistically, not wholesale.** The goal is feature delivery; good patterns come along for the ride.

### Grilling decisions (settled — do not relitigate)

| Decision                      | Outcome                                                                                                                                                                                                                                                                                        |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Goal                          | Feature parity **plus** extensions. CLI should exceed VS Code capability.                                                                                                                                                                                                                      |
| Priority order                | 1. OpenAI-compatible local LLM provider, 2. Recent commits as style examples (`previous` format), 3. Project config, 4. Custom instructions + `custom` format, 5. Languages, 6. Formats, 7. Issue refs                                                                                         |
| Offline generator             | Stays conventional-only. No multi-format offline work.                                                                                                                                                                                                                                         |
| Git blame                     | Deepen, but stay inside a token budget.                                                                                                                                                                                                                                                        |
| Custom instructions           | CLI already has `--context` for ad-hoc injection. Persistent customization goes in `~/.config/commitSage/templates/*.md`, not a config string.                                                                                                                                                 |
| Versioning                    | v2.0.0 is the current rewrite. Feature adoption lands as minors through v2.7, then v3.0.                                                                                                                                                                                                       |
| Commitlint                    | Deferred — undecided.                                                                                                                                                                                                                                                                          |
| OpenRouter OAuth              | **Deferred past v2.1, flow undecided.** RFC 8628 device code vs localhost callback are both legitimate; neither is selected. API key / manual token entry continues to work. Earlier drafts of `feature-gap.md` and `roadmap.md` each picked a different flow — both are now marked undecided. |
| `freeform` vs `custom` format | Distinct, both stay. `freeform` = AI-only, no template file. `custom` = user template from `~/.config/commitSage/templates/*.md`. No deprecation, no migration path.                                                                                                                           |
| Project config directory name | **Undecided.** The docs previously asserted `.commit-sage/config.json` as if grilled; it never was. Candidates: `.commitSage/` (consistent with the global camelCase path), `.commitsage/` (shared with the extension), kebab. Project config remains future work.                             |
| Verification                  | Smoke tests (`mask typecheck`, `mask lint`, real provider calls per family). No test framework was adopted; Config V2 explicitly declined one.                                                                                                                                                 |
| Telemetry / walkthroughs      | Permanently out of scope.                                                                                                                                                                                                                                                                      |

### Quality bar

- Exact file paths and symbol names from the actual source, not paraphrase.
- Effort estimates in days with named dependencies between features.
- No placeholders, no "TBD", no emoji status markers in tables.
- Every recommendation traced to a specific observed difference between the codebases.

---

## Method

1. **Index** both external repos (`codegraph init`) in parallel.
2. **Explore** both extensions and the CLI with targeted `codegraph_explore` calls — providers, templates, config, workflow, auth, telemetry, commitlint, blame.
3. **Grill** the user on goal, scope, priorities, and version strategy before writing anything.
4. **Write** the six documents into `docs/future-work/`.
5. **Commit** as a single `docs:` conventional commit.

## Outcome

Six documents, committed as `dd6c546`. Roadmap totals 34–45 days across four phases.
