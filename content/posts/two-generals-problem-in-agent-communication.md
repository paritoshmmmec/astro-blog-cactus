---
external: false
title: "The Two Generals Problem in Agent Communication"
description: "When a parent agent hands work to a subagent, neither can ever be certain the other got the last message. The oldest impossibility result in distributed computing explains duplicated tool calls, lost completions, and agents that wait forever."
date: 2026-06-25
tags: ["agent", "reliability", "distributed-systems"]
---

Two armies surround a city in a valley, one on each hill. General A must attack at dawn, but only if General B attacks too; one army alone loses. A's messenger crosses the valley with the plan. Did B get it? B cannot know if A knows it got it, so B dares not commit, and any number of acknowledgement rounds never closes the gap. Every confirmation needs a confirmation, and the messenger might always die on the last hop.

This fable is the Two Generals Problem, and it comes with a rare gift: a proof. No finite protocol of unacknowledged messages over an unreliable channel lets two parties reach *guaranteed* common knowledge. It is provably impossible, which is why it is the oldest impossibility result in distributed computing, and why every practical protocol since has been an exercise in deciding which guarantee to weaken.

Now watch an agent framework dispatch a subagent. The parent sends a task; the network, the queue, or a crashed process may eat it. The subagent finishes and sends completion; same risk. The parent re-sends the task "just in case"; the original was received, and now the work happens twice. Every failure in this paragraph is the fable, wearing a lanyard. Multi-agent systems are built from message passing between unreliable processes, which means they inherited the problem in full, and most frameworks are pretending they did not.

## Three Familiar Wrecks, One Old Cause

The fable's signature is visible wherever agents talk to agents. Three shapes of it, each with a different wrong reflex.

### The duplicated tool call

A parent dispatches "run the migration" to a worker, hears nothing (timeout, queue hiccup, dropped webhook), and re-dispatches. Both dispatches were received and executed. The migration ran twice, or two agents ran it concurrently and produced the classic split brain: two writers, each certain it is the owner. The reflex that caused it ("uncertain means resend") is correct messaging and incorrect *semantics*: the operation was not safe to repeat.

### The lost completion

The worker finished, sent its result, and died satisfied. The result was lost. The parent waits. The worker is gone. With no acknowledgement protocol and no recovery path, the parent's options collapse into waiting forever (the agent equivalent of the messenger dying on the return hop) or guessing whether the work happened, which is how double-execution gets its second chance.

### The polite deadlock

Two agents in a joint task, each waiting for the other's confirmation before proceeding. Each *sent* its part; each is now blocked on receiving. Nobody crashed. The system is simply two processes, each holding a half of the same misunderstanding, indefinitely.

What makes these wrecks instructive is that the proof says they cannot be *eliminated*: not by better prompts, not by a smarter orchestrator. Unreliable channels do not yield certainty. What practical systems do instead is pick their guarantee deliberately, and make the leftovers harmless. That is the actual lesson of the fable, and it comes in three parts.

## Part One: Choose At-Least-Once, Then Make It Safe

The first choice is between losing work and repeating it. Protocols that deliver at-most-once can drop messages; protocols that deliver at-least-once can duplicate them. Exactly-once delivery (the thing everyone asks for) does not exist at the transport layer; it is a property you build *above* a delivery guarantee, and the building material is idempotency.

For agent dispatch, the choice is rarely close: a lost task is a lost run, while a duplicated task is recoverable if made safe. So: at-least-once delivery, plus the machinery that makes duplicates boring. Every task carries an idempotency key (derived from the task content, not minted per attempt), and every effectful tool the task invokes deduplicates on it. The parent's re-dispatch, previously the cause of the double migration, becomes an idempotent no-op if the first attempt lived. This is the same contract the tools post demanded of write-shaped tools; dispatch is simply its most important customer.

Notice what this move does to the impossibility proof. The generals still cannot *know* they agree (the proof stands). But the duplicate no longer matters, and a disagreement that does not matter is, operationally, an agreement. That is the standard move in every real protocol: not defeating the impossibility, but choosing which residue of uncertainty the system can shrug off.

## Part Two: Acknowledge Like You Mean It

The lost completion is a protocol gap, not a network fatality, and the fix is the oldest one in messaging: the receiver's acknowledgement is part of the protocol, not an afterthought. A task is not "sent"; it is *owned*, and ownership is visible to both parties, which is exactly what the lease pattern provides. The worker claims the task (durable, heartbeated), the claim *is* the acknowledgement, and the parent reads the lease table instead of guessing from silence.

The result's journey gets the same treatment: results are written to durable storage with a reference handed back (the artifact pattern), and the parent's fetch of that reference is itself acknowledged. At every hop, the message's status is a fact in a table rather than an inference from an absence. Silence then has exactly one meaning, "the next message has not happened yet," instead of its current four.

And the polite deadlock dissolves under the same light: two agents waiting on each other's confirmations is two processes blocking on acknowledgements that were never protocol. Make the state explicit and one of them will discover, from the table, that it can proceed. Deadlocks love ambiguity; protocols starve them.

## Part Three: Weaken the Guarantee You Cannot Have

What remains genuinely unfixable is the last hop: the parent can never be *certain* the worker received the final "stop" or "keep going." The fable guarantees it. Practical systems stop trying to guarantee it and start designing so that it does not matter, and two tools do most of this design.

### Timeouts with defined recovery

Every wait has a deadline, and the deadline's expiry triggers a named action: re-dispatch (idempotent), escalate, or give up with a status. A timeout that expires into "unspecified" is not a timeout; it is a coin you have not yet flipped.

### Fencing on the residue

When re-dispatch happens despite uncertainty (the split brain), the lease's fence token demotes the older claimant's writes to harmless noise. The older general can still attack the city; his orders simply stop mattering at the resource. The uncertainty was never resolved. It was *contained*, which the proof says is the best on offer.

Read back through the three wrecks and notice the shape of the whole answer: idempotent duplicates, acknowledged ownership, deadlines with recovery, fenced residue. None of these require trusting the channel more. None require the model to be more careful. All of them live in the runtime, in the same layer as every other mechanism this series has installed, because the two-generals problem was never a reasoning failure, and reasoning was never going to solve it.

The fable's proof is more than half a century old and unimproved upon, because it cannot be. What improved is what engineers built *around* the impossibility: protocols that choose their guarantees and contain their residue. Agent frameworks are the newest guests at that table, and the valley between the hills is as wide as ever.
