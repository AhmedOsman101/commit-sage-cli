# Commit Sage

Genera mensajes de commit significativos con IA — o análisis estático offline
— directamente desde tu terminal.

> **CLI-first desde v1.8.0.** `commit-sage` ahora es una CLI autocontenida y multiplataforma
> (`generate`, `commit`, `config`) con sobrescrituras por flags, flujo interactivo de staging
> y respaldo `--offline`.

## Descripción

Commit Sage convierte tu `git diff` en un mensaje de commit. Dos caminos, una misma superficie:

- **Camino IA** — diff + contexto -> proveedor (OpenAI, Gemini, Ollama, … 11
  en total) -> mensaje estructurado (`conventional` / `angular` / `emoji` / `semantic` /
  `freeform`).
- **Camino offline** — `git diff-index --name-status` -> mensaje convencional determinista
  (port de auto-commit-msg, sin API, sin red). Ideal para CI o entornos sin clave.

Elige la superficie según el momento: `generate` imprime un mensaje a stdout
(canalizable, usable en hooks), `commit` ejecuta el flujo completo selección -> vista previa -> commit
-> push, `config` inspecciona o edita la configuración JSON.

## Requisitos

- Git en tu `PATH`.
- Internet para proveedores IA (omítelo con `--offline` o `ollama` local).
- Deno 2.x solo si compilas desde el código fuente (`mask compile`).

## Instalación

Tres formas — todas instalan el mismo binario `commit-sage`.

### Binario precompilado (Releases)

Descarga el artefacto para tu plataforma desde [Releases](https://github.com/AhmedOsman101/commit-sage-cli/releases).

```shell
# ejemplo: Linux x64 — elige el artefacto que coincida con `uname -s` / `uname -m`
curl -L -o commit-sage https://github.com/AhmedOsman101/commit-sage-cli/releases/latest/download/commit-sage-linux-x64
chmod +x commit-sage
mv commit-sage ~/.local/bin/commit-sage   # asegúrate de que ~/.local/bin esté en $PATH
commit-sage --version
```

Activos producidos por `mask release` -> `bin/`:

- `commit-sage-linux-x64`
- `commit-sage-linux-arm64`
- `commit-sage-macos-x64`
- `commit-sage-macos-arm64`
- `commit-sage-windows-x64.exe`
- `commit-sage-windows-arm64.exe`

Los instaladores DMG de macOS y NSIS de Windows también se publican — ver abajo.

### Instalación rápida (Linux y macOS)

```shell
curl -fsSL https://raw.githubusercontent.com/AhmedOsman101/commit-sage-cli/main/installer/unix.sh | bash
```

Esto ejecuta [`installer/unix.sh`](installer/unix.sh): detecta `linux`/`macos` +
`x86_64`/`arm64`, obtiene la última `vX.Y.Z` de la API de GitHub, instala
en `~/.local/bin/commit-sage` (sobrescribe con `INSTALL_DIR`), opcionalmente
añade `~/.local/bin` a tu config de shell y verifica con `commit-sage --version`.

Personaliza:

```shell
INSTALL_DIR=~/bin VERSION=1.8.0 bash <(curl -fsSL https://raw.githubusercontent.com/AhmedOsman101/commit-sage-cli/main/installer/unix.sh)
```

Ver [`installer/README.md`](installer/README.md) para el curl manual + configuración de PATH.

### Windows

- **Instalador (recomendado):** descarga `commit-sage-setup.exe` desde
  Releases y ejecuta el asistente. Instala en `C:\Program Files\commitSage`,
  añade a `PATH`, crea accesos de Menú Inicio + Escritorio. Construido con
  [`installer/windows/commit-sage.nsi`](installer/windows/commit-sage.nsi); ver
  `installer/windows/build-installer.ps1`.
- **Portable:** descarga `commit-sage-windows-x64.exe`, renombra a `commit-sage.exe`,
  colócalo donde quieras en `PATH`.
- **DMG macOS:** `CommitSage-<version>-macos-{x64,arm64}.dmg` vía
  `installer/macos/build-dmg.sh` (requiere `create-dmg`).

### Compilar desde el código fuente

Requiere [Deno](https://deno.land/) y [mask](https://github.com/jacobdeichert/mask).

```shell
git clone https://github.com/AhmedOsman101/commit-sage-cli.git commit-sage
cd commit-sage
mask compile              # -> ~/.local/bin/commit-sage
mask release              # cross-compila los 6 targets -> bin/
```

## Uso

`commit-sage` sin argumentos imprime ayuda (convención git/npm) — nunca genera silenciosamente. Subcomandos:

```
commit-sage [flags]
  generate        Genera un mensaje desde el diff staged, lo imprime a stdout
  commit          Flujo interactivo: seleccionar archivos -> generar -> vista previa -> commit -> push opcional
  config          Inspeccionar o modificar la configuración (get/set/list/path/default/open/edit)
  help [sub]      Muestra ayuda para un subcomando
  --help, -h      Muestra ayuda
  --version, -V   Muestra versión (1.8.0)
```

Códigos de salida:

- `0` éxito (incluido `--push` warn-and-skip cuando no hay remote).
- `1` error CLI/IO/config.
- `2` uso (flag desconocido / arg faltante).
- `130` abortado (Esc en el TUI, SIGINT).

### `commit-sage generate [flags]`

Texto puro entrada/salida.

Flujo interactivo:

- Si nada staged -> TUI multiselect sobre unstaged tracked + untracked (Cliffy
  Checkbox, buscable, select-all) -> `git add`.
- Re-verifica staged; si sigue vacío y `commit.onlyStagedChanges=true` -> salida 1;
  si no, respeta `generation.diffStrategy`.
- Genera mensaje (IA o `--offline`).
- Vista previa markdown vía `@littletof/charmd` (subject en negrita + body).

Imprime el resultado. Sale sin hacer commit, útil para canalizar e integrar con otras herramientas.

> [!Important]
> Necesita un TTY para el selector/confirmación. Ver [Non-TTY](#non-tty) abajo.

### `commit-sage commit [flags]`

Mismo flujo interactivo que `commit-sage generate` más:

- Confirmación (`commit.autoCommit` o `-y/--yes` la omite).
- `git commit -m "<subject>" -m "<body>"` (`-e` si `--edit`).
- `git push` opcional (ver `--push` abajo; `-u` en el primer push, aviso-y-salto si no hay `origin`).

### `commit-sage config <subcommand>`

7 subcomandos, no requiere repo git:

| Subcomando                    | Qué hace                                                                                                                            |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `get <section>.<key>`         | Imprime un valor combinado; avisa `not set — using default fallback: …` si no está definido por el usuario                          |
| `set <section>.<key> <value>` | Convierte (boolean/number/string según `TYPE_MAP`) + `validateOrError` + persiste en `CONFIG_PATH`                                  |
| `list` / `print`              | Vuelca config combinada (defaults + sobrescrituras) como JSON                                                                       |
| `path`                        | Imprime `CONFIG_PATH`                                                                                                               |
| `default`                     | Imprime `DEFAULT_CONFIG` como JSON                                                                                                  |
| `open`                        | Abre `CONFIG_PATH` en el handler del SO (`open`/`xdg-open`/`cmd /c start`), fallback a `$EDITOR`                                    |
| `edit`                        | Abre en `$EDITOR`/`$VISUAL`/fallback (`vi`/`notepad`), re-lee, parsea JSON, `validateOrError` — inválido restaura backup en memoria |

Las claves son `<section>.<key>` con section siendo una sección válida de config.
Sección/clave desconocida o tipo erróneo -> salida 1 con mensaje claro.

## Ejemplos

Todos asumen que estás dentro de un repo git y `commit-sage` está en tu `$PATH`.

```shell
# 1 — generación básica: diff staged -> mensaje IA a stdout (canalizable)
commit-sage generate

# 2 — offline (sin API, no necesita TTY): mensaje convencional determinista desde filas de estado
commit-sage generate --offline

# 3 — flujo interactivo de commit: elegir archivos -> vista previa -> confirmar -> git commit
commit-sage commit

# 4 — commit + push rama actual (aviso-y-salto si no hay origin, salida 0)
commit-sage commit --push

# 5 — cambiar modelo sin abrir un archivo (string único proveedor/modelo)
commit-sage config set model openai/gpt-5

# 6 — inspeccionar config combinada
commit-sage config print

# bonus — commit offline, y generación con contexto IA extra + longitud máxima personalizada
commit-sage commit --offline
commit-sage generate --context "fixes #123, retry on 5xx" --max-length 72
commit-sage generate --model ollama/gpt-oss-120b --format emoji --lang russian
commit-sage config get model
commit-sage config path
```

<!-- TODO: Add actual demos
Más en `docs/demos/` (gifs):  -->

## Referencia de flags

### Flags compartidos `generate` / `commit`

Una tabla — ambos subcomandos aceptan los mismos 7 flags (commit añade 3 más abajo).

| Flag               | Descripción                                                                                                                                                                                     | Notas                                                                                                                                       |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `--offline`        | Usa generador de análisis estático (sin API). Siempre forma convencional `<type>: <desc>` o simple `<desc>`; trunca en límite de palabra `--max-length`.                                        | Ignora `--format`; sigue respetando `--max-length`; necesita filas `git diff-index` — archivos untracked no aparecerán hasta hacer stage.   |
| `--context <text>` | Inyecta `## External Context\n<text>` antes del diff en el prompt IA.                                                                                                                           | **Solo IA** — ignorado con `--offline`.                                                                                                     |
| `--model <name>`   | Modelo para esta ejecución en formato `proveedor/modelo` (ej. `openai/gpt-5-nano`). La primera barra separa proveedor de modelo; ids multisegmento preservados (`9router/kc/stealth/ox-alpha`). | Sobrescritura por ejecución del `model` top-level; cualquier string `proveedor/modelo` aceptado — el proveedor valida al llamar.            |
| `--format <name>`  | Plantilla de commit: `conventional`, `angular`, `karma`, `emoji`, `semantic`, `freeform`.                                                                                                       | **Solo IA** — ignorado con `--offline` (offline siempre convencional). Default `conventional` (ver `commit.commitFormat`).                  |
| `--lang <name>`    | Idioma del commit (BCP-47, guardado tal cual, ej. `en`, `en-US`, `jp`).                                                                                                                         | Sobrescritura por ejecución de `commit.commitLanguage`; normalizado internamente.                                                           |
| `--max-length <n>` | Sobrescribe `commit.maxLength` para este mensaje.                                                                                                                                               | Aplica a **ambos** IA y `--offline` (truncado en límite de palabra + `…`).                                                                  |
| `--edit`           | Abrir antes de guardar.                                                                                                                                                                         | `generate`: tempfile + `$EDITOR`/`$VISUAL` -> imprime final a stdout. `commit`: pasa `-e` a `git commit` -> editor sobre el mensaje staged. |

Flags solo de `commit`:

| Flag              | Aplica a | Descripción                                                                                                           | Notas                                                                                                                                           |
| ----------------- | -------- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `--push [branch]` | `commit` | Push tras un commit exitoso. Bare `--push` empuja la rama actual; `--push <name>` empuja esa rama.                    | Aviso-y-salto (no falla) si no hay remote / no hay `origin`; auto `-u` (set upstream) en el primer push a una rama. Salida 0 incluso al omitir. |
| `--no-push`       | `commit` | No hacer push, aunque `commit.autoPush=true` o `--push` fuese anterior.                                               | Sobrescribe `--push` y `commit.autoPush`.                                                                                                       |
| `-y, --yes`       | `commit` | Omitir diálogos de confirmación (commit + confirmación de push) sin importar `commit.autoCommit` / `commit.autoPush`. | También leído como `commit.autoCommit`/`commit.autoPush` en config.                                                                             |

### Subcomandos `config`

| Subcomando                    | Descripción                                                                                                                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `get <section>.<key>`         | Imprime un valor; avisa si la clave no está definida por el usuario y hace fallback a `DEFAULT_CONFIG`.                                                                        |
| `set <section>.<key> <value>` | Convierte + valida + persiste (no necesita flag `--write`). Boolean: `true`/`false` (insensible a mayúsculas). Number: finito. String: crudo.                                  |
| `list` / `print`              | Config combinada como JSON (defaults + sobrescrituras del usuario). Alias: `print`.                                                                                            |
| `path`                        | `CONFIG_PATH` resuelto.                                                                                                                                                        |
| `default`                     | `DEFAULT_CONFIG` como JSON.                                                                                                                                                    |
| `open`                        | Handler del SO -> fallback `$EDITOR`.                                                                                                                                          |
| `edit`                        | `$EDITOR`/`$VISUAL`/fallback (`vi`/`notepad`) + backup en memoria y restauración ante JSON inválido o fallo `validateOrError`; imprime `Config saved and validated.` al éxito. |

## Non-TTY

- `generate` -> requiere `$PROVIDER_API_KEY` (ej. `OPENAI_API_KEY`,
  `GEMINI_API_KEY`; `ollama` no necesita) cuando stdin no es un TTY. Si no,
  falla con `No API key found in $... and stdin is not a TTY...`. Todos
  los prompts interactivos colgarían — por eso fallamos rápido.
- `commit` -> falla sin un TTY (selector de staging + confirmaciones son
  interactivos). Usar `--offline` con `--yes` aún necesita un TTY para el flujo; para CI,
  prefiere `generate --offline | git commit -F -`.
- `--offline` (ambos subcomandos) -> siempre no-interactivo, sin clave, sin TTY.

## Configuración

La config vive en `~/.config/commitSage/config.json` en
Linux/macOS, `%APPDATA%\commitSage\config.json` en Windows (ver
`src/lib/constants.ts:CONFIG_PATH`), más un `DEFAULT_CONFIG` en proceso.

Inspecciona con `commit-sage config list` (combinada) o `commit-sage config default` (defaults).

Resuelve la ruta con `commit-sage config path`.

Define con `commit-sage config set <section>.<key> <value>` o edita con `commit-sage config edit` / `commit-sage config open`.

Cada `set`/`edit` valida contra `config.schema.json` (generado desde
`src/lib/types/configSchema.ts` — ejecuta `mask schema build` / `mask schema check`
— no edites el schema a mano).

### `model` top-level + registro `providers` (Config V2)

Un único string canónico selecciona proveedor y modelo. División en la primera
`/` — izquierda proveedor, derecha modelo (barras siguientes preservadas):

| Clave   | Tipo                   | Por defecto           | Descripción                                                                                         |
| ------- | ---------------------- | --------------------- | --------------------------------------------------------------------------------------------------- |
| `model` | `string` (forma `a/b`) | `"openai/gpt-5-nano"` | `"9router/kc/stealth/ox-alpha"` -> proveedor `9router`, modelo `kc/stealth/ox-alpha`. Falla sin `/` |

El transporte por proveedor vive en el registro `providers`. `providers.defaults`
guarda defaults IA compartidos; `providers.<name>` sobrescribe por proveedor
(registro abierto — routers propios sin cambios de código):

| Clave                          | Tipo             | Por defecto         | Descripción                                                                                                   |
| ------------------------------ | ---------------- | ------------------- | ------------------------------------------------------------------------------------------------------------- |
| `providers.defaults.timeoutMs` | `number`         | `60000`             | Timeout de la petición                                                                                        |
| `providers.defaults.reasoning` | `string/boolean` | `"off"`             | `off`, `default`, `low`, `medium`, `high`, `xhigh`, `ultra` (tri-estado con boolean)                          |
| `providers.defaults.apiType`   | `string`         | `"openai-chat"`     | `openai-chat`, `openai-responses`, `anthropic`                                                                |
| `providers.<name>.baseUrl`     | `string`         | por proveedor       | ej. `http://localhost:11434/api` para `ollama`                                                                |
| `providers.<name>.apiKey`      | `string`         | `"$<NAME>_API_KEY"` | Prefijo `$` lee env, si no literal del archivo; opcional para locales (`ollama`)                              |
| `providers.<name>.apiType`     | `string`         | hereda              | Sobrescritura por proveedor                                                                                   |
| `providers.<name>.models`      | mapa             | —                   | Presets por modelo (`name`, `reasoning`, `contextWindow`, `maxInputTokens`, `maxOutputTokens`, `temperature`) |

Los presets `providers.<name>.models` resuelven por valor
(`preset de modelo > proveedor > defaults`) y se gestionan con `config edit` —
`config get/set` sigue shallow por diseño.

No confundas el string `model` guardado con el flag por ejecución
`--model` (ver [Referencia de flags](#referencia-de-flags)).

### Todas las secciones de un vistazo

| Sección      | Clave                | Tipo      | Por defecto         | Notas                                                                                                             |
| ------------ | -------------------- | --------- | ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `generation` | `maxRetries`         | `number`  | `3`                 | Reintento en fallo de API                                                                                         |
| `generation` | `retryDelay`         | `number`  | `1000`              | Backoff de reintento                                                                                              |
| `generation` | `temperature`        | `number`  | `0.7`               | Temperatura del modelo (default global; presets por modelo pueden sobrescribir)                                   |
| `generation` | `maxPromptTokens`    | `number`  | `100000`            | Tokens de diff enviados a la IA (truncado contado por tokens)                                                     |
| `generation` | `diffStrategy`       | `string`  | `"auto"`            | `staged` / `unstaged` / `auto`                                                                                    |
| `providers`  | `defaults.timeoutMs` | `number`  | `60000`             | Timeout compartido                                                                                                |
| `providers`  | `defaults.reasoning` | `string`  | `"off"`             | Default compartido de reasoning                                                                                   |
| `providers`  | `defaults.apiType`   | `string`  | `"openai-chat"`     | Tipo API compartido                                                                                               |
| `providers`  | `<name>.baseUrl`     | `string`  | por proveedor       | ej. `ollama` -> `"http://localhost:11434/api"`; `openrouter` -> `"https://openrouter.ai/api/v1"`                  |
| `providers`  | `<name>.apiKey`      | `string`  | `"$<NAME>_API_KEY"` | Prefijo `$` lee env, si no literal; opcional para locales                                                         |
| `providers`  | `<name>.apiType`     | `string`  | hereda              | `openai-chat`, `openai-responses`, `anthropic`                                                                    |
| `commit`     | `autoCommit`         | `boolean` | `false`             | Omite confirmación `Commit changes?` (o usa `-y/--yes`)                                                           |
| `commit`     | `autoPush`           | `boolean` | `false`             | Omite confirmación `Push to <branch>?` (o usa `-y/--yes`)                                                         |
| `commit`     | `commitFormat`       | `string`  | `"conventional"`    | `conventional`, `angular`, `karma`, `emoji`, `semantic`, `freeform` (`freeform` solo IA)                          |
| `commit`     | `onlyStagedChanges`  | `boolean` | `true`              | Cuando es true y nada staged tras el selector, `commit` sale con `No staged changes`; si no, cae a `diffStrategy` |
| `commit`     | `commitLanguage`     | `string`  | `"english"`         | BCP-47, guardado tal cual (`en`, `en-US`, `jp` …); `--lang` sobrescribe                                           |
| `commit`     | `promptForRefs`      | `boolean` | `false`             | Reservado (preparado para futuro prompt de refs)                                                                  |
| `commit`     | `maxLength`          | `number`  | `80`                | Límite de subject; `--max-length` por ejecución                                                                   |
| `commit`     | `bodyStyle`          | `string`  | `"subject-body"`    | `subject-only`, `subject-body`, `subject-body-footer`                                                             |

Las variables de entorno siguen siendo alternativa para la clave: define `GEMINI_API_KEY`,
`OPENAI_API_KEY`, etc. antes de ejecutar. Para una sola ejecución:

```shell
OPENAI_API_KEY='sk-...' commit-sage generate --model openai/gpt-5
```

Ollama no necesita clave. Las claves guardadas en el archivo JSON siguen el mismo enrutado `proveedor/modelo`.

## Contribuciones

¡Contribuciones bienvenidas! Lee [`CONTRIBUTING.md`](CONTRIBUTING.md) primero.

Formatea antes de hacer commit.

Sigue Conventional Commits para los mensajes.

## Herramientas de Terceros

<a href="https://bizbot.zvo.cn/index.html" target="_blank" rel="noopener">BizBot: AI automated promotion system</a>

## Agradecimientos

Inspirado por la extensión [CommitSage para VS Code](https://marketplace.visualstudio.com/items?itemName=VizzleTF.geminicommit) de Ivan K. ([GitHub](https://github.com/VizzleTF/CommitSage)) (MIT). Motivó el port a CLI en Deno — gracias, Ivan.

## Licencia

GPLv3 — ver [`LICENSE`](LICENSE).

## Contacto

[GitHub](https://github.com/AhmedOsman101) · [ahmad.ali.othman@outlook.com](mailto:ahmad.ali.othman@outlook.com)
