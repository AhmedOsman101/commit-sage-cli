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

Make sure you have [Deno](https://deno.land/) installed on your system if you plan to compile the project yourself.

### Option 1: Compile from Source

Clone the repository and compile the executable:

```shell
git clone https://github.com/AhmedOsman101/commit-sage-cli.git commit-sage

cd commit-sage

# Compiles the executable to your `~/.local/bin` directory. Ensure `~/.local/bin` is added to your $PATH.
deno task run compile
```

### Option 2: Download Prebuilt Binary

Alternatively, you can download the prebuilt binary for your platform from the [Releases page](https://github.com/AhmedOsman101/commit-sage-cli/releases) on GitHub. Follow these steps:

1. Visit the [Releases page](https://github.com/AhmedOsman101/commit-sage-cli/releases).
2. Download the appropriate binary for your operating system (e.g., `commit-sage-linux`, `commit-sage-macos`, or `commit-sage-windows.exe`).
3. Rename the binary to `commit-sage` and place it in a directory included in your `$PATH` (e.g., `~/.local/bin` for Linux/macOS or any directory for Windows).
4. Ensure the binary is executable (on Linux/macOS, run `chmod u+x commit-sage`).
5. Run `commit-sage` from your terminal to use the tool.

## Usage

### Basic Usage

Navigate to your Git repository and run `commit-sage` to generate a commit message based on your changes:

![](docs/commitSage.gif)

### Advanced Usage with git-commit Wrapper

For enhanced functionality, consider using the `git-commit` wrapper script from [AhmedOsman101/shellScripts](https://github.com/AhmedOsman101/shellScripts).

This wrapper script extends `commit-sage` with:

- Conventional commit message support
- AI-powered commit messages using `commit-sage`
- Additional Git integration features

![](docs/gitCommit.gif)

![](docs/gitCommitStaged.gif)

To use the wrapper script:

1. Install it from [AhmedOsman101/shellScripts](https://github.com/ahmedOsman101/shellscripts#installation)
2. Run `git-commit --ai` in your repository instead of `commit-sage`

The wrapper script provides a seamless integration between conventional commit formats and AI-generated messages.

## Configuration

The app requires an API key for the AI service it uses. You can set it up in two ways:

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

You can customize any options in the configuration file located at `~/.config/commit-sage/config.json`.

## Requirements

- Deno 2.x or higher
- Git installed and accessible in your PATH
- Internet connection for AI service communication (unless using [Ollama](https://github.com/ollama/ollama))

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
By contributing to `commit-sage-cli`, you agree to license your contributions under the GNU General Public License v3.0.

## Limitations

The following are known limitations in the current version of commit-sage, with plans to address them in future updates:

- [ ] Handle files with spaces in their names. Currently, the program may fail or behave unexpectedly when processing files containing spaces.

## Acknowledgment

`commit-sage-cli` is a derivative work based on the [CommitSage VS Code extension](https://marketplace.visualstudio.com/items?itemName=VizzleTF.geminicommit) by Ivan K. ([GitHub](https://github.com/VizzleTF/CommitSage)), licensed under the MIT License. I cloned and significantly modified the CommitSage codebase to create a Deno CLI tool, adapting its innovative approach to commit generation for CLI use. Thank you, Ivan, for your open-source contribution, which inspired and enabled this project!

## License

`commit-sage-cli` is licensed under the [GNU General Public License v3.0](LICENSE). The full text of the GPLv3 is available in the [LICENSE](LICENSE) file.

For reference, the original CommitSage project is licensed under the MIT License by Ivan K. The MIT License text is available at [https://github.com/VizzleTF/CommitSage/](https://github.com/VizzleTF/CommitSage/) for further details.

## Contact

For questions or feedback about `commit-sage-cli`, please contact me via [GitHub](https://github.com/AhmedOsman101) or email at [ahmad.ali.othman@outlook.com](mailto:ahmad.ali.othman@outlook.com).
