# 0004 — Refs render as a `Refs:` footer line

Refs (issue IDs) are appended to the message as a trailing `Refs: <a>, <b>` line, with `commit.refs.placement` mapping to the extension's semantics (`end` default: own line below; `start`: own line above; `prefix`: same line as subject). This diverges from the extension, which appends the raw token line. Chosen because a labeled footer is unambiguous to parse later (e.g. for changelog tooling), and the raw-token form is easy to mistake for body text.
