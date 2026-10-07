## Question

Ship the project-config CLI surface, per `docs/plans/v3.0-project-config-commitlint.md` and ADR 013.

## Scope

- `config init [--global]`: scaffold `$schema` + `model` + full `commit` + full `generation` + one `providers.gemini` placeholder (`apiKey: "$GEMINI_API_KEY"`). Existing file asks `overwrite?`, never clobbers.
- `config set --project` (creates `.commitsage/` as needed; `models` presets stay global-only), `config get --source` (flag | project | global | default).
- `--config <path>` on `generate`/`commit`: file is the whole config, no overlay, no trust gate. Missing path exit 2; invalid file exit 1.
- README: project-config section, `--config` semantics, CI recipe (`--config` for automation).

## Done when

Init/set/get/--config integration tests pass, overwrite-decline is safe, schema check green.
