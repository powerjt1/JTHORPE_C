# Mother — Knowledge Base

**Mother** is the persistent knowledge layer for JABBNETWORKS: operational specs,
agent personalities, guardrails, and integration patterns that any session can
reference (*"What does Mother say about Julian's guardrails?"*).

Entries are extracted from source and kept faithful to it — no invention. Each
entry names its source and capture date.

## Entries

| Entry | Source | Notes |
|-------|--------|-------|
| [JABB System Architecture](./JABB-System-Spec.md) | `JABB-key.py` (FastAPI backend + JABB agent runtime + tests) | 8-agent build. Includes a reconciliation table vs. the repo's 10-agent MotherBridge roster. |

## Relationship to MotherBridge

The [MotherBridge](../motherbridge/) prompt library + kernel is the **current
10-agent system** this repo builds. `JABB-key.py` (the first Mother entry) is a
**separate/earlier 8-agent build**; the entry flags the roster differences
(Phoenix→Christina, Sentinel→Kaira; MotherBridge adds Ryan + MiaKkcar) so the two
aren't silently merged.
