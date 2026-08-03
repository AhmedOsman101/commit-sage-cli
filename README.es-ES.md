

# Commit Sage

Una potente herramienta de CLI que te ayuda a generar mensajes de commit significativos con IA analizando tus cambios de Git.

## Descripción general

Commit Sage analiza los cambios en tu repositorio de Git y utiliza IA para generar mensajes de commit relevantes según el contexto. Te ahorra tiempo y ayuda a mantener un historial de commits consistente con mensajes descriptivos.

## Características

- Analiza cambios preparados (staged) y sin preparar (unstaged) en tu repositorio de Git
- Genera mensajes de commit basados en los cambios reales del código
- Soporta diferentes tipos de cambios (preparados, sin preparar, sin seguimiento, eliminados)
- Omita automáticamente los cambios en submódulos
- Funciona con cualquier repositorio de Git

## Requisitos

- Git instalado y accesible en tu PATH
- Conexión a Internet para la comunicación con el servicio de IA (a menos que uses [Ollama](https://github.com/ollama/ollama))
- Deno 2.x o superior (si se compila desde el código fuente)

## Cómo Funciona

1. Commit Sage detecta si te encuentras en un repositorio de Git
2. Analiza los cambios en tu repositorio (preparados, sin preparar, etc.).
3. Los cambios se procesan y se envían a un servicio de IA.
4. La IA genera un mensaje de commit relevante según el contexto.
5. Se muestra el mensaje de commit sugerido para que lo utilices.

### Manejo de Errores

Commit Sage proporciona mensajes de error claros para problemas comunes:

- Cuando no se detectan cambios
- Cuando la clave API no está configurada
- Cuando Git no está instalado o el directorio no es un repositorio de Git

## Instalación

### Opción 1: Descargar Binario Precompilado

Puedes descargar el binario precompilado para tu plataforma desde la [página de Releases](https://github.com/AhmedOsman101/commit-sage-cli/releases) en GitHub. Sigue estos pasos:

1. Visita la [página de Releases](https://github.com/AhmedOsman101/commit-sage-cli/releases).
2. Descarga el binario correspondiente a tu sistema operativo (por ejemplo, `commit-sage-linux`, `commit-sage-macos` o `commit-sage-windows.exe`).
3. Renombra el binario a `commit-sage` y colócalo en un directorio incluido en tu `$PATH` (por ejemplo, `~/.local/bin` para Linux/macOS o cualquier directorio para Windows).
4. Asegúrate de que el binario sea ejecutable (en Linux/macOS, ejecuta `chmod u+x commit-sage`).
5. Ejecuta `commit-sage` desde tu terminal para usar la herramienta.

---

### Opción 2: Compilar desde el Código Fuente

Alternativamente, puedes compilarlo desde el código fuente.

Clona el repositorio y compila el ejecutable:

```shell
git clone https://github.com/AhmedOsman101/commit-sage-cli.git commit-sage

cd commit-sage

# Compiles the executable to your `~/.local/bin` directory. Ensure `~/.local/bin` is added to your $PATH.
deno task run compile
```

> [!Note]
>
> Si planeas compilar el proyecto tú mismo, asegúrate de tener [Deno](https://deno.land/) instalado en tu sistema.

## Uso

### Uso Básico

Navega a tu repositorio de Git y ejecuta `commit-sage` para generar un mensaje de commit basado en tus cambios:

![](docs/commitSage.gif)

---

### Uso Avanzado con el Envoltorio git-commit

Para una funcionalidad mejorada, considera usar el script envoltorio `git-commit` de [AhmedOsman101/shellScripts](https://github.com/AhmedOsman101/shellScripts).

Este script envoltorio extiende `commit-sage` con:

- Soporte para mensajes de commit convencionales
- Mensajes de commit potenciados por IA usando `commit-sage`
- Características adicionales de integración con Git

![](docs/gitCommit.gif)

![](docs/gitCommitStaged.gif)

Para usar el script envoltorio:

1. Instálalo desde [AhmedOsman101/shellScripts](https://github.com/ahmedOsman101/shellscripts#installation)
2. Ejecuta `git-commit --ai` en tu repositorio en lugar de `commit-sage`

El script envoltorio proporciona una integración fluida entre los formatos de commit convencionales y los mensajes generados por IA.

## Configuración

La aplicación requiere una clave API para el servicio de IA que utiliza. Puedes configurarla de dos formas:

### Variables de Entorno

Agrega lo siguiente a tu archivo de configuración de shell (por ejemplo, `~/.bashrc`, `~/.zshrc`):

```shell
export SERVICE_API_KEY='your_api_key'
```

Reemplaza `SERVICE` con el nombre del servicio correspondiente y `your_api_key` con tu clave API real.

Después de agregar estas líneas, reinicia tu terminal o ejecuta `source ~/.bashrc` para aplicar los cambios.

**Exportar antes de ejecutar**

Este método establece la clave API para una sola ejecución.

```shell
SERVICE_API_KEY='your_api_key' commit-sage
```

> [!NOTE]
>
> Si estás usando `ollama` como tu proveedor, puedes omitir toda la configuración de claves API y variables de entorno.
> Ollama se ejecuta localmente y no requiere autenticación ni acceso a la red.

---

### Archivo de Configuración

Puedes personalizar cualquier opción en el archivo de configuración ubicado en `~/.config/commitSage/config.json`.

El archivo de configuración permite personalizar el comportamiento de reintentos, proveedores de modelos, formato de commits y el uso del proveedor predeterminado.

#### Opciones de Configuración Disponibles

##### `general`

| Clave                   | Tipo   | Predeterminado | Descripción                          |
| --------------------- | ------ | --------------- | ------------------------------------ |
| `maxRetries`          | número | `3`     | Número de intentos de reintento en caso de fallo. |
| `initialRetryDelayMs` | número | `1000`  | Retardo (ms) antes del primer reintento.   |

---

##### `gemini`

| Clave     | Tipo   | Predeterminado                  | Opciones                                                                                |
| ------- | ------ | ------------------------ | -------------------------------------------------------------------------------------- |
| `model` | string | `"gemini-2.0-flash-exp"` | `"gemini-2.0-flash-exp"`, `"gemini-1.0-pro"`, `"gemini-1.5-pro"`, `"gemini-1.5-flash"` |

---

##### `ollama`

| Clave       | Tipo   | Predeterminado                    | Descripción                  |
| --------- | ------ | -------------------------- | ---------------------------- |
| `model`   | string | `"llama3.2"`               | Nombre del modelo de Ollama.    |
| `baseUrl` | string | `"http://localhost:11434"` | URL base para la API de Ollama. |

---

##### `openai`

| Clave       | Tipo   | Predeterminado                       | Descripción          |
| --------- | ------ | ----------------------------- | -------------------- |
| `model`   | string | `"gpt-3.5-turbo"`             | Modelo de OpenAI a usar. |
| `baseUrl` | string | `"https://api.openai.com/v1"` | URL base de la API de OpenAI. |

---

##### `commit`

| Clave                 | Tipo    | Predeterminado          | Opciones / Descripción                                             |
| ------------------- | ------- | ---------------- | ----------------------------------------------------------------- |
| `onlyStagedChanges` | booleano | `true`           | Limita los mensajes de commit a cambios preparados.                          |
| `commitLanguage`    | string  | `"english"`      | `"english"`, `"russian"`, `"chinese"`, `"japanese"`               |
| `autoCommit`        | booleano | `false`          | Realizar commit automáticamente después de generar el mensaje.                    |
| `autoPush`          | booleano | `false`          | Hacer push al remoto después de realizar el commit.                                  |
| `commitFormat`      | string  | `"conventional"` | `"conventional"`, `"angular"`, `"karma"`, `"emoji"`, `"semantic"` |
| `promptForRefs`     | booleano | `false`          | Solicitar referencias (por ejemplo, números de issue) durante el commit.                 |

---

##### `provider`

| Clave    | Tipo   | Predeterminado    | Opciones                                           |
| ------ | ------ | ---------- | ------------------------------------------------- |
| `type` | string | `"gemini"` | `"gemini"`, `"openai"`, `"ollama"` |

## Limitaciones / No Implementadas Aún

Las siguientes son limitaciones conocidas en la versión actual de **commit-sage**, con planes de abordarlas en actualizaciones futuras:

- [x] **Manejar archivos con espacios en sus nombres**
       Anteriormente, el programa podría haber fallado o comportarse de manera inesperada al procesar archivos con espacios en sus nombres. Esto ha sido resuelto.

- [ ] **Opciones de configuración aún no implementadas**
       Las siguientes opciones están definidas en el esquema para compatibilidad futura, pero actualmente son **no funcionales** y se ignorarán en tiempo de ejecución:
  - [ ] `commit.autoCommit`
  - [ ] `commit.autoPush`
  - [ ] `commit.onlyStagedChanges`
  - [ ] `commit.promptForRefs`

> [!NOTE]
>
> Estas opciones pueden permanecer de forma segura en tu configuración. No causarán errores, pero actualmente no tienen ningún efecto.
> Se incluyen como marcadores de posición para funciones próximas que están en consideración activa o desarrollo.

## Herramientas de Terceros

<a href="http://bizbot.zvo.cn" target="_blank" rel="noopener">
  <img src="https://img.shields.io/badge/Tool-BizBot-blue" alt="BizBot: AI aautomated promotion system">
</a>

## Contribuciones

¡Las contribuciones son bienvenidas! Por favor, lee el archivo [CONTRIBUTING.md](CONTRIBUTING.md) para conocer las directrices antes de enviar un Pull Request.
Al contribuir a `commit-sage-cli`, aceptas licenciar tus contribuciones bajo la Licencia Pública General GNU v3.0.

## Agradecimientos

`commit-sage-cli` se inspiró en la [extensión CommitSage para VS Code](https://marketplace.visualstudio.com/items?itemName=VizzleTF.geminicommit) de Ivan K. ([GitHub](https://github.com/VizzleTF/CommitSage)), licenciada bajo la Licencia MIT. Su proyecto me motivó a crear una herramienta de CLI con Deno, adaptando su enfoque para la generación de commits para su uso en CLI. Gracias, Ivan, por tu contribución de código abierto.

## Licencia

`commit-sage-cli` está licenciado bajo la [Licencia Pública General GNU v3.0](LICENSE). El texto completo de la GPLv3 está disponible en el archivo [LICENSE](LICENSE).

## Contacto

Para preguntas o comentarios sobre `commit-sage-cli`, por favor contáctame a través de [GitHub](https://github.com/AhmedOsman101) o por correo electrónico en [ahmad.ali.othman@outlook.com](mailto:ahmad.ali.othman@outlook.com).
