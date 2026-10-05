# 0006 — Named custom template files deferred out of M2

M2 keeps `commitFormat` a closed enum over built-in formats. The named-template loader (user-named Markdown files under the config directory, `commitFormat:"<name>"`) is deferred to its own design round, with `~/.config/commitSage/templates/` and project-config variants in scope then. The extension has no equivalent (it uses a single verbatim-instructions custom format), so this is a designed-here extension rather than a parity item, and it needs the template-sandbox discussion first.
