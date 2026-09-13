---
external: false
title: "The Failure Modes of Generous Tools"
description: "The single worst property a tool can have is helpfulness. Pagination, honest counts, structured errors, idempotency—tool design is the actual lever on agent reliability."
date: 2026-05-01
tags: ["agent", "design"]
---

There is a sentence I have come to dread in tool documentation: "returns all matching results." It is usually phrased as a feature. It is almost never one.

When an agent calls a tool, the tool's return value is not just data. It is data that will enter a context window, be paid for on every subsequent turn, compete for attention against everything else in that window, and outlive its usefulness by many turns. Tool designers, building for human APIs, optimize for the human request: give me everything, I will scroll. Tool designers building for agents are building for a consumer that cannot scroll, pays per byte, and degrades gracefully only when the data was shaped for it.

I have argued before that agent loops need backpressure, and that bounded tool contracts are the first pattern of it. This post is the expanded case: a catalog of the ways tools fail their agent consumers, and the design rules that fix each one. The claim underneath it all is simple. If your agents misbehave, look at your tools before you look at your prompts.

## Failure One: Returning Everything

The generous tool is the original sin. A search that returns all 4,000 matches. A log fetch that ships the whole day. A `read_file` that dumps 20k tokens for a question that needed forty lines.

The damage is not the single large append, bad as that is. It is the shape of the punishment over time. The 50k-token result gets billed on every following turn of the session. It crowds the attention window, pushing the task instruction toward the forgotten middle. And it teaches the model, mid-session, that tools are firehoses—which it then generalizes, calling other tools carelessly because carelessness was affordable once.

The fix is the contract from the backpressure post, and it is worth restating as a design rule for tool authors: **every listing tool paginates**. A hard ceiling on returned bytes, an honest `total_count`, and a cursor for the next page. The cursor is the part teams skip, and skipping it is what turns truncation into information loss. A ceiling without a cursor is a tool that lies by omission; a cursor converts the ceiling into a choice the consumer controls.

## Failure Two: Dishonest Counts

Pagination without honest counts fails more subtly. A tool returns the first 20 results—fine—but says nothing about whether there are 21 or 21,000 more. The agent cannot tell "this is a representative sample" from "this is page one of a firehose," and it makes decisions on that missing fact.

Humans get this for free. Open a search page and the "about 4,120 results" line is doing quiet work: it tells you whether to refine the query or start reading. An agent needs the same signal in machine-readable form, because its alternative is *discovering* the result size by paging through it—paying for every page—or guessing, which it will do with unwarranted confidence.

The design rule: **a truncation flag and a total count on every bounded response**. The count does not need to be exact under load; "roughly 4,000" is honest enough. What breaks agents is not imprecision but absence—silence that reads as completeness.

## Failure Three: Unstructured Errors

Watch what happens when a tool call fails and the error is a stack trace. The model does what models do with text that looks important: it quotes the whole thing into the conversation, then attempts a repair based on pattern-matching the traceback. Sometimes it even gets the repair right. What it never does is cheap: a stack trace is 200 tokens of noise around one line of signal, quoted forever after.

Contrast an error shaped for a machine:

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "retryable": true,
    "retry_after_ms": 2000,
    "detail": "per-minute quota exhausted"
  }
}
```

Every field changes the agent's next move. `retryable: false` ends the loop instead of feeding it. `retry_after_ms` replaces the model's guess about how long to wait—a guess it otherwise anchors on nothing. A stable `code` lets the *runtime*, not the model, make policy decisions about backoff and circuit-breaking.

The design rule: **errors are part of the tool's interface, not its accident**. Enumerate the failure modes, give each a code the model can condition on, and say explicitly whether retrying is sane. A tool whose errors are prose is a tool whose failures get amplified by its consumers.

## Failure Four: Non-Idempotent Operations

A tool that charges a card, sends an email, or creates a record will eventually be called twice. Not because the agent is stupid, but because retries are a fact of networks—a timeout is indistinguishable from a lost response, and both the runtime and the model will, correctly, retry.

Without idempotency, the retry double-charges. With idempotency—an idempotency key the caller supplies, the server deduplicates on—the retry is free. Every payment API learned this the hard way; Stripe's idempotency keys are the canonical example. Agent tooling needs it more than payment APIs do, because agent loops retry more aggressively than any human integrator, and because the agent often cannot tell that the first call actually succeeded: the response was lost, the context was compacted, or the model simply misread.

The design rule: **every write-shaped tool accepts an idempotency key, and the runtime supplies it deterministically**—derived from the task, the tool, and the arguments, not generated fresh per attempt. This dovetails with the lease pattern for multi-agent work: the same discipline that makes re-dispatch safe makes retries boring.

## Failure Five: The Blind Spot for State

The last failure is the quiet one: tools that answer queries against state that has already moved. The agent checks a file exists, then writes to it—and the file was moved between check and write by another agent. The agent reads a row, reasons about it, writes it back—and the row changed underneath.

Race conditions are not exotic in multi-agent settings; they are Tuesday. Humans solved this with conditional operations: compare-and-swap, optimistic concurrency, preconditions on write. Tool interfaces for agents need the same. A write tool that accepts an expected-state parameter—"only write if the file still looks like X"—converts a silent corruption into a clean, retryable conflict.

The design rule: **stateful tools expose their concurrency model**. At minimum: conditional writes on everything mutable, and leases or fencing on anything two agents might claim at once. The tool interface is where coordination stops being a prompt suggestion and becomes a mechanism.

## The Meta-Rule

Notice what all five rules have in common: none of them asks the model to be smarter. That is the meta-rule, and I keep coming back to it because it keeps being the answer. Pagination is not a prompting strategy. Idempotency keys are not a personality trait. The reliability of an agent system is decided in the tool interfaces, by the people who write them, before any model ever arrives on the scene and starts making decisions with what those interfaces hand it.

The generous tool feels kind. It is the kind of kindness that bills you forever.
