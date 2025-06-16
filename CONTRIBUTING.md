# Contributing to Commit Sage

Thanks for your interest! Here's how to get started:

## Setup

1. Clone the repo:

```sh
git clone https://github.com/AhmedOsman101/commit-sage-cli.git
cd commit-sage-cli
```

2. Install [Deno](https://deno.land/)

> [!warning]
>
> This project requires Deno v2.2 or higher.

3. Run the project locally (I recommend using ollama as your provider when developing):

```sh
deno task dev
```

## Making Changes

- Ensure your changes pass all existing logic.
- Format with `deno task format` before committing any changes.
  - Requires `pnpm` to run Biome via `pnpm dlx`, since Deno does not currently support `devDependencies`.
- Follow the [Conventional Commits](https://www.conventionalcommits.org/) format.

## Submitting a PR

- Fork the repo
- Create a new branch (use prefixes like `feat/`, `fix/`, etc.)
- Push your changes and open a pull request
- Write a clear title and description of your changes

## Issues

Use the issue templates when possible. For small enhancements, feel free to open a discussion first.

> "If you have questions or suggestions, feel free to [open an issue](https://github.com/AhmedOsman101/commit-sage-cli/issues) or [email me directly](mailto:ahmad.ali.othman@outlook.com).”
