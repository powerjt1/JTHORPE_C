# MotherBridge Voice Integration Specification

**Document:** MB-VOICE-SPEC · **Version:** 0.1.0 · **Status:** Draft (V2 — design)
**Company:** JABBNETWORKS LLC · **Product:** JABBNETWORKS AIOS Enterprise
**Implementation language:** Python 3.11+

> How users **talk to Lucy** and hear the team talk back. Voice is a front-end to
> the same kernel — speech becomes an intent, the intent is routed and executed
> exactly like a typed request, and the reply is spoken in the responding agent's
> voice. This is a **design spec** (no reference implementation yet); it defines
> the `VoiceCoordinator` contract named in §6.9 of the
> [Kernel Specification](./KERNEL-SPEC.md) and the "Say *Hey Lucy*" affordance in
> the AIOS Command Center.

## 1. Goals

- **Voice is a channel, not a second brain.** STT produces an intent; from there it
  flows through the existing [Router](./EVENT-BUS-SPEC.md), Policy Engine, and
  [A2A messaging](./A2A-PROTOCOL-SPEC.md) — no parallel logic.
- **Per-agent voices.** Each agent has a distinct, consistent TTS voice, so the
  user can tell who is speaking (Lucy vs. Alex vs. Kaira).
- **Barge-in and low latency.** The user can interrupt; partial transcripts stream;
  responses begin speaking as soon as text is available.
- **Auditable & governed.** Every utterance and spoken reply is logged to shared
  memory like any other interaction; mutating actions still require approval.
- **Kernel-brokered.** The speech provider (Azure AI Speech) is an external
  connection brokered by the kernel — the browser never holds provider keys.

## 2. Architecture

```
 Browser mic ──audio──▶ Voice gateway (backend) ──▶ Azure Speech STT ──┐
   (Command Center)                                                    │ transcript
        ▲                                                              ▼
        │ audio (TTS)                                     VoiceCoordinator (kernel)
        │                                                     │ intent
   Azure Speech TTS ◀── spoken reply ◀── agent reply text ◀── Router → agent runtime
```

- The **browser** captures mic audio and plays TTS audio; it holds **no secrets**.
- A **voice gateway** in the backend proxies audio to/from Azure Speech (keys via
  Key Vault) and hands transcripts to the kernel — mirroring how OAuth/email keys
  stay server-side today.
- The **VoiceCoordinator** turns a transcript into an intent, dispatches it through
  the normal path, and turns the agent's reply text into speech in that agent's
  voice.

## 3. Session lifecycle

```
idle → wake ("Hey Lucy") → listening → transcribing → dispatched
     → speaking (agent reply) → listening | idle
```

- **Wake** — a wake word ("Hey Lucy") or an explicit mic tap opens a session.
- **Listening / transcribing** — streaming STT emits *partial* then *final*
  transcripts; the Command Center shows the live caption.
- **Dispatched** — the final transcript becomes an intent (§5) and is routed.
- **Speaking** — the responding agent's reply is synthesized and played; the
  avatar for that agent animates to `speaking` (see
  [avatar-system.md](../avatar-system.md)).
- **Barge-in** — new mic energy during `speaking` cancels playback and returns to
  `listening`.
- A session times out to `idle` after a configurable silence window.

## 4. VoiceCoordinator interface (proposed)

```python
@dataclass
class VoiceProfile:
    agent_id: str            # MB-0NN
    voice: str               # Azure voice name, e.g. "en-US-AriaNeural"
    style: str = "chat"      # optional speaking style
    rate: str = "+0%"        # prosody

@dataclass
class Utterance:
    session_id: str
    text: str                # final transcript
    is_final: bool
    lang: str = "en-US"
    ts: str = ""             # ISO-8601 UTC

class VoiceCoordinator:
    def start_session(self, user_id: str, lang: str = "en-US") -> str: ...   # -> session_id
    def on_transcript(self, utterance: Utterance) -> Task | None: ...        # route final transcripts
    def speak(self, agent_id: str, text: str, session_id: str) -> bytes: ... # -> audio (or a stream handle)
    def voice_for(self, agent_id: str) -> VoiceProfile: ...
    def end_session(self, session_id: str) -> None: ...
```

- **`on_transcript`** ignores partials and, on a final transcript, builds an intent
  and calls `Kernel.dispatch` — returning the resulting `Task` (or `None` if the
  utterance was small talk / a wake phrase).
- **`speak`** resolves the agent's `VoiceProfile` and synthesizes via the gateway.
- **`voice_for`** maps an agent to its voice; defaults live in config, overridable
  per deployment.

## 5. From speech to intent

1. Final transcript → normalized text.
2. Text → **intent string** (v0.1: the transcript *is* the intent, matched by the
   existing keyword [Router](./KERNEL-SPEC.md); later: an NLU step for slots).
3. `Kernel.dispatch(project_id, intent)` routes to the owning agent, records the
   task in shared memory, and emits `task.created` on the
   [event bus](./EVENT-BUS-SPEC.md).
4. The agent's reply text is returned to the coordinator and spoken via `speak`.

Addressing a specific agent by name ("Ask Kaira to review…") sets an explicit
recipient, bypassing keyword routing — the voice equivalent of A2A's explicit
`to_agent`.

## 6. Events & audit

- New event-bus topics (additive): `voice.session.started`,
  `voice.transcript.final`, `voice.reply.spoken`, `voice.session.ended`.
- Every final transcript and spoken reply is appended to shared memory under the
  session/project scope — the same append-only audit trail as text interactions,
  so a voice run is fully reconstructable.
- Telemetry: STT/TTS latency, wake-to-first-word, barge-in count.

## 7. Security, privacy & governance

- **No provider keys in the browser** — audio is proxied through the backend voice
  gateway; Azure Speech is a kernel-brokered [connection](../connections.md).
- **Consent & retention** — the user is told when the mic is live; raw audio is
  transient (not persisted by default), while transcripts follow the shared-memory
  retention policy. Configurable per tenant.
- **Human-in-the-loop** — a spoken command that triggers a mutating action still
  hits the Policy Engine and a confirmation gate ("You said delete X — confirm?").
  Voice can request, not authorize.
- **PII / sensitive speech** handling and any biometric voice features are reviewed
  and owned by **Kaira (MB-009)**.
- Voice/UX quality and the persona of each agent's voice are owned by
  **MiaKkcar (MB-010)**.

## 8. Roadmap

- **0.1 (this spec):** VoiceCoordinator contract, session lifecycle, transcript→
  intent via the existing router, per-agent voices, audit topics.
- **0.2:** reference implementation — backend voice gateway + Azure Speech STT/TTS,
  streaming partials, barge-in, Command Center wired to live sessions.
- **0.3:** NLU slot-filling for richer intents; multilingual voices; noise
  robustness; telephony (inbound/outbound) and meeting-bot channels.

## 9. Version History
- v0.1.0 — 2026-07-20 — initial Voice Integration design spec (VoiceCoordinator
  contract, session lifecycle, speech→intent path, audit, governance).
