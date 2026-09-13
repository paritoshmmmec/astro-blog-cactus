---
external: false
title: "Write-Ahead Logs: Why Your Agent Framework Needs a Journal"
description: "Long-running agent sessions crash mid-task and lose everything. Databases solved durable partial work in the 1970s with one idea: write intent before action. An agent loop is a transaction processor, and it deserves a journal."
date: 2026-06-03
tags: ["agent", "reliability"]
---

The demo gods have a favorite script, and it goes like this. An agent has been working for forty minutes—twelve tool calls deep into a migration, half the files edited, a plan of real value assembled in its context. Then the process dies. OOM kill, deploy restart, laptop lid closed, provider outage, whatever. You restart the session, and the question that decides whether you just lost an afternoon arrives: what did the framework do with those forty minutes?

For most frameworks, the answer is: nothing durable. Context was in memory or in a cache the provider owns. Tool calls happened and cannot be undone, some succeeded and some did not and nobody knows which. You start over, or you reconstruct by forensics, reading logs like an insurance investigator.

Databases were here in the 1970s, staring at the same problem in uglier clothes: a transaction that touches a hundred pages of disk cannot be made atomic, yet a crash can hit between any two page writes. Their answer—the write-ahead log—is one of the most load-bearing ideas in computing, and it ports to agent loops almost without metaphor. The port is the subject of this post.

## The Rule: Intention Before Action

The WAL rule fits in a sentence: *record what you are about to do before you do it, in durable storage, and only then do it*.

The "write-ahead" in the name is the ordering constraint. Before the database modifies a data page, it appends a redo record to the log and fsyncs. If the system dies between the log append and the page write, recovery replays the log: the intent survived, so the action can be redone. If it dies before the log append, the action never officially happened. The log, not memory, is the system's notion of truth.

Now lay the agent loop over it. A turn arrives; the model emits a plan. Tool calls are proposed. Each proposal is an *intent*. Each execution is an *action*. The mapping is exact:

```txt
before each tool call:
  append {seq, task_id, tool, args, idempotency_key} to journal; fsync
  execute the call
  append {seq, result, status} to journal; fsync
```

Crash anywhere in this sequence and recovery knows which world it is in. Died after the first append but before execution? The call was never made; replay skips it or re-proposes it. Died after execution but before the result was journaled? The idempotency key makes the re-execution safe—the second attempt is deduplicated at the tool, exactly as argued in the post on generous tools. Died mid-task? Replay the journal into a fresh context: every completed call, every result, the plan that produced them. The forty-minute run becomes a thirty-second recovery.

## What Recovery Looks Like

The replay deserves its own section, because it is where the design earns its keep—and where the naive version has a hole worth naming.

Replaying a journal into a new session is not just "print the old transcript." A fresh model instance needs the journal *curated*: the task, the plan as last stated, a summary of completed work, the pending step. This is compaction with a guarantee underneath—the difference between the ad-hoc summarization a framework improvises at overflow time (and the failure modes cataloged in the backpressure post) and a summarization performed against a durable record where nothing is invented, because everything is checked against entries that really happened. The journal constrains the summarizer. It cannot hallucinate a tool result that the log contradicts.

The hole: replayed tool *effects* in the outside world. If the journal says "sent the email" and recovery re-runs it, the email goes twice—unless the tools are idempotent, which is why the journal design leans on that earlier post's contract rather than merely citing it. Durable logs and idempotent operations are not two optimizations. They are one mechanism split across two layers: the log makes intent recoverable, idempotency makes replay safe. Building either without the other is how frameworks end up with a resume button that double-charges.

## Checkpoints, Not Just Logs

A journal that grows forever turns recovery into archaeology—replaying nine thousand entries to resume a session is its own outage. Databases solve this with checkpoints: periodically, the durable state is snapshotted, everything before the snapshot's log position becomes unnecessary, and recovery starts from the snapshot plus the short tail.

Agent sessions want the same. Every K turns, snapshot the session state—the compacted context, the task state, the positions in any work queues—and record the journal position it covers. Recovery reads the newest snapshot and replays only the tail. The snapshot cadence is a tuning knob with a familiar shape: checkpoint too rarely and recovery replays a novel; too often and you pay the serialization cost constantly. Databases live on this knob; so will agent frameworks.

There is a second payoff beyond crash recovery, and it is the one that will finally make these frameworks auditable. The journal *is* the audit trail: what the agent intended, in what order, with what arguments, and what came back. Compliance asks for this. Incident postmortems ask for this. Even mundane debugging asks for this—"why did the agent delete that file" has a one-line answer when intents are journaled, and a hedge when they are not. The write-ahead log is usually sold as durability. It is equally a *truthfulness* mechanism: the system's story about itself, written down as it happens, ordered, and impossible to revise.

## The Uncomfortable Question

The honest objection is performance, and it deserves a straight answer. Two fsyncs per tool call—one before, one after—is real latency on real disks, on the order of milliseconds each even on good NVMe. An agent whose tool calls take five seconds each will not notice. An agent making rapid-fire local calls will.

The databases answered this fifty years ago, and the answers port: group commit (batch the journal writes of concurrent sessions, amortizing one fsync across many intents), async journaling for calls classified as safely retryable, in-memory journals with periodic flush for sessions whose loss is acceptable. The design space is not new. It is a pricing decision—how much is an afternoon of agent work worth, in milliseconds of latency?—and pricing decisions are exactly what engineering is for.

Every durable system you trust—every database, every queue, every file system—runs on the same fifty-year-old rule: write the intent down first. Agent frameworks bolt impressive machinery onto sessions that evaporate on contact with a redeploy. The journal is the missing floor.
