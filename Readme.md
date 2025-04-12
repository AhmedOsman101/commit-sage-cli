# Commit Sage

A powerful Deno CLI application that helps you generate meaningful commit messages by analyzing your Git changes.

## Overview

Commit Sage analyzes the changes in your Git repository and uses AI to generate contextually relevant commit messages. It saves you time and helps maintain a consistent commit history with descriptive messages.

## Features

- Analyzes staged and unstaged changes in your Git repository
- Generates commit messages based on the actual code changes
- Supports different types of changes (staged, unstaged, untracked, deleted)
- Skips submodule changes automatically
- Works with any Git repository

## Installation

Make sure you have [Deno](https://deno.land/) installed on your system.

```shell
git clone https://github.com/AhmedOsman101/commit-sage.git

cd commit-sage
# compiles the executable to your ~/.local/bin, you need to add it to your $PATH
deno task run compile
```

## Usage

Navigate to your Git repository and run:

```shell
commit-sage
```

## Configuration

Commit Sage requires an API key for the AI service it uses. You can set it up in two ways:

### Environment Variable

Add the following to your shell configuration file (e.g., `~/.bashrc`, `~/.zshrc`):

```shell
export SERVICE_API_KEY='your_api_key'
```

Replace `SERVICE` with the appropriate service name and `your_api_key` with your actual API key.

After adding these lines, restart your terminal or run `source ~/.bashrc` to apply the changes.

### Export before running

This method sets the API key for a single run.

```shell
SERVICE_API_KEY='your_api_key' commit-sage
```

## Configuration File

Alternatively, you can set the API key in the application's configuration settings.

## Requirements

- Deno 2.x or higher
- Git installed and accessible in your PATH
- Internet connection (for AI service communication)

## How It Works

1. Commit Sage detects if you're in a Git repository
2. It analyzes the changes in your repository (staged, unstaged, etc.)
3. The changes are processed and sent to an AI service
4. The AI generates a contextually relevant commit message
5. The suggested commit message is displayed for you to use

## Error Handling

Commit Sage provides clear error messages for common issues:

- When no changes are detected
- When the API key is not set
- When Git is not installed or the directory is not a Git repository

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
By contributing to commit-sage, you agree to license your contributions under the GNU General Public License v3.0.

## Limitations

The following are known limitations in the current version of commit-sage, with plans to address them in future updates:

- [ ] Handle files with spaces in their names. Currently, the program may fail or behave unexpectedly when processing files containing spaces.

## Acknowledgment

This project, `commit-sage`, drew significant inspiration from the [CommitSage VS Code extension](https://marketplace.visualstudio.com/items/?itemName=VizzleTF.geminicommit) by Ivan K ([GitHub](https://github.com/VizzleTF/CommitSage)).
Their innovative approach to enhancing commit workflows motivated me to create a Deno-based tool with similar goals, tailored for command-line use.
Thank you Ivan for your open-source contribution, which sparked this project!

## License

This project is licensed under the [GNU General Public License v3.0](LICENSE).
