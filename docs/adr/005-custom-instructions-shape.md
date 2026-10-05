# 0005 — `customInstructions` accepts inline text or an `.md` path

`commit.customInstructions` holds either an inline string or a path to a Markdown file. Detection: if the value ends in `.md` and the file exists, it is read; otherwise it is treated as literal instruction text. Chosen because long instructions inline in JSON are uneditable, but forcing every user to keep a file path adds friction for short notes. Trade-off: a literal instruction string ending in `.md` is misread; users can rename or inline-wrap it.
