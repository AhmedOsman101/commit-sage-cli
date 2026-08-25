# Triage Labels

The skills (`/triage`, `/wayfinder`) speak in terms of five canonical triage roles. This file maps those roles to the actual label strings used in `AhmedOsman101/commit-sage-cli`.

| Role in mattpocock/skills | Label in this tracker | When to use |
|---------------------------|-----------------------|-------------|
| `needs-triage` | `needs-triage` | Maintainer needs to evaluate this issue |
| `needs-info` | `needs-info` | Waiting on reporter for more information |
| `ready-for-agent` | `ready-for-agent` | Fully specified, ready for an AFK agent |
| `ready-for-human` | `ready-for-human` | Requires human implementation |
| `wontfix` | `wontfix` | Will not be actioned |

When a skill says "apply the AFK-ready triage label", use `ready-for-agent`.

## Wayfinder ticket types

Each wayfinder child carries exactly one `wayfinder:<type>` label:

| Label | Meaning |
|-------|---------|
| `wayfinder:map` | The map issue itself (e.g. #22 CLI migration) |
| `wayfinder:research` | Research ticket |
| `wayfinder:prototype` | Prototype ticket |
| `wayfinder:grilling` | Grilling ticket (HITL) |
| `wayfinder:task` | Task ticket (e.g. T1–T8 #23–#30) |

Frontier = first open child whose `blocked_by` is 0 and has no assignee. Map #22 + children #23–#30 follow this model; see `issue-tracker.md` § Wayfinding operations.
