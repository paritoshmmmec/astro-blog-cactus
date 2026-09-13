---
external: false
title: "Agent Loops Need Backpressure, Not Bigger Context Windows"
description: "Agent context windows are unbounded queues. Classic flow control -- backpressure, admission control, compaction -- fixes agent failures that bigger context windows never will."
date: 2026-09-13
tags: ["agent", "reliability"]
---

When an agent fails in production, it rarely fails dramatically. Nobody pages you because the model answered wrong. You get paged because the run that was supposed to take forty seconds took forty minutes, burned a hundred dollars of tokens, and died with a context-overflow error at 2am.

Ask around and you will hear the same proposed fix every time: bigger windows. If the run fell over at 128k tokens, surely 1M tokens fixes it.

It does not. The failure is not that the buffer is too small. The failure is that nobody controls what enters the buffer at all.

## What Backpressure Is

Every long-running system you rely on already solved this problem. The solution is called backpressure, and it is one of the oldest ideas in computing.

TCP cannot know how much data a receiver can absorb, so the receiver advertises a window and the sender is forced to slow down when it fills. Reactive Streams, the specification behind Akka and Project Reactor, is built on a single mechanism: a subscriber pulls `n` items, and a well-behaved producer may not push item `n+1` until the subscriber asks. Kafka consumers do the same thing by poll: a consumer processes a bounded batch, then explicitly polls again.

The implementations differ. The invariant is the same:

> The consumer controls the rate. A producer may not push unbounded work into a consumer that has not agreed to absorb it.

When that invariant is violated, systems do not fail randomly. They fail in one of a few well-known ways. Watch an agent loop for a while and you will see all of them.

## The Context Window Is a Queue

Here is the actual loop behind nearly every agent framework, stripped of its abstractions:

```txt
while not done:
    result = model.predict(context)      # consumer
    context.append(result)               # unbounded append
    for tool_call in result.tool_calls:
        outputs = run_tools(tool_call)
        context.append(outputs)          # unbounded append
```

Look at those two `append` calls. That is a queue with no admission control. Anyone can push into it -- the model's own verbosity, a subagent, a log-scraping tool -- and the only ones who get a vote on the queue length are the producers.

If you have ever operated a message broker without consumer-lag monitoring, you have run this system before. It fails the way brokers fail:

Cost is the first thing to go wrong. Every token appended is paid for on every subsequent turn. A tool that returns a 50k-token log turns one careless call into 50k tokens of rent, charged again on each of the next twenty turns. Attention cost grows superlinearly with context length, so the bill compounds faster than your intuition says. The run does not fail. It just gets slower and more expensive, which is worse, because nobody built an alert for it.

Quality goes next. Long-context evaluation keeps finding the same thing: models recall the start and the end of a window far better than the middle. Append an unbounded stream of tool output to a conversation and the original task -- the instruction you actually care about -- ends up buried somewhere in the middle of the queue. The model is not dumber in a long window. It is being asked to find a needle in a haystack, and you keep buying more hay.

Eventually the queue overflows the window. It always will; the window is finite. "Infinite context" is marketing language for a retrieval system. When the overflow comes, the loop does one of three things, and all three are bad: it throws and loses the whole run, it silently truncates and loses the constraint, or it invents a compaction scheme on the fly and loses whichever piece of state it judged least important. None of these are designs. They are outcomes.

Spawning subagents makes every one of these worse. Each subagent runs its own loop with its own unbounded appends, then pushes its full transcript back to the parent, which appends that too. Now you have unbounded producers, and producers that spawn more unbounded producers.

If you have operated systems, this list should feel familiar.

## The Five Patterns

Backpressure for agent loops is a handful of patterns rather than one mechanism. The same patterns show up anywhere real flow control exists, and five of them carry over almost unchanged.

### Bounded tool contracts

TCP senders are capped by an advertised window. Good tools need the same: a contract that bounds what a producer can push into the queue.

You can spot an unbounded tool easily: it returns everything. A bounded tool returns a *page*:

```json
{
  "results": ["...", "..."],
  "total_count": 4123,
  "next_cursor": "eyJvZmZzZXQiOiAyfQ==",
  "truncated": false
}
```

The contract has three parts: a hard ceiling on returned bytes, an honest `total_count` so the agent knows what it is not seeing, and a cursor so it can pull more *deliberately*. That last word matters. A cursor converts a push into a pull. The consumer now controls the rate.

Compare two tools that read files. One behaves like `cat`: it returns the whole file, so a 20k-token source file appends 20k tokens to your queue for a question that needed forty lines. The other exposes `offset` and `limit` and returns a window. The second tool puts the producer on a leash instead of handing it a firehose.

### Admission control

Bounded producers are not enough, because one producer has no contract at all: the model itself. It decides which tool to call, which it will keep calling until someone stops it. Something in the loop has to be allowed to say *no*, and "please don't" is not a mechanism. A prompt is a wish, not a valve.

The fix is to move the queue decision out of the model and into code. Before a tool result is appended, a component that is not probabilistic enforces a policy:

```txt
append(tool_result) requires:
    projected_size <= byte_budget
    else: truncate to budget, set flag, continue
```

This is the same principle I argued for in Agent Skills Need a Runtime, Not a Prompt: sequencing and guards belong in deterministic code, not in suggestions the model is free to ignore. The runtime owns the budget, the truncation, and the flag. The model experiences it like gravity, not like advice.

### Compaction as garbage collection

Stop treating the context window as memory you write to once. Treat it as memory you manage, because that is what a long-running process does with its heap.

Generation 0 is the hot set: system prompt, current task, the last few turns. Small, always resident, never evicted. Generation 1 is everything older: resolved tool results, finished subagent transcripts, exploration that did not pan out. It gets summarized down to a few structured lines and the full text goes to durable storage, not the window.

The analogy comes with failure modes included. Compaction that runs too rarely is a memory leak with extra steps. Compaction that drops a live constraint is a use-after-free: the model cites a document that is no longer in its window, and it does so with total confidence. So a compactor needs what a garbage collector has: *pinning*. The task description, active constraints, and open decisions are pinned objects; the summarizer is not allowed to touch them.

### Named artifacts, not inline payloads

Half the stuff we append to context is not there to be reasoned over. It is there because we had nowhere else to put it.

So put it somewhere else. When a tool produces something big -- a build log, a dataset, a diff -- write it to storage under a stable name and append only the reference:

```txt
artifacts/build-2026-09-13.log   (184,203 tokens, on disk)

context receives:
  artifact: build-2026-09-13.log
  summary:  compilation failed; 3 errors, all in payment/...
  retrieve: read(path="artifacts/build-2026-09-13.log",
                offset=?, limit=?)   # pull, not push
```

The model keeps a card catalog entry: what it is, where it lives, how to pull it. The full payload moves only when a step deliberately reads a slice. This is also how object storage works: the catalog is not the data, and keeping the two apart is what makes both cheap and reliable.

### Cancellation and timeouts as first-class citizens

Backpressure has a sharper cousin: refusing to let work start, or killing it when it overruns. Agent loops are remarkably bad at both.

An agent that spawns five subagents waits for all five, even the one that has been hallucinating in a corner for ten minutes. A tool call with no timeout is a hung TCP connection that nobody is tracing. Nobody cancels anything, because the loop has no handle to cancel with.

The fix is mundane: every unit of work gets a deadline, a parent that watches it, and a cancellation token. The parent cancels the speculative branch whose interim results nobody is consuming -- the same call an event loop makes when it drops work nobody is waiting on. Dropping speculative work is what makes speculation affordable in the first place.

## A Worked Example

All of this is easier to see on a concrete failure. Suppose an agent is asked why the login endpoint is slow. It calls a tool to fetch recent logs. The tool, being generous, returns 40,000 tokens of log lines.

The naive loop appends them and asks the model to "analyze the logs":

- The append alone costs about $0.60 on a mid-tier model, and it is charged again on every following turn. Twenty turns later, one careless call has cost about $12.
- The task instruction is now somewhere near the bottom of a 45k-token queue, heading for the middle.
- Two more log fetches later, the window is gone and the run dies.

The loop with backpressure handles the same call like this:

```txt
model calls fetch_logs(service="login-api")

runtime:
  bytes := estimate(40_000 tokens)          # ~160KB
  if bytes > TOOL_BUDGET (24KB):
      write full result -> artifacts/logs-2026-09-13.log
      return to context:
          artifact: logs-2026-09-13.log
          summary: 12,381 lines; 96% INFO; 214 lines
                   contain "timeout" or "5xx"
          retrieve: read(path, offset, limit)
  if projected_context > CONTEXT_BUDGET:
      compact()   # summarize + evict gen-1, pins untouched
```

The model never sees the firehose. It sees a card and a retrieval tool it can call with a window. Each `read` costs 2k tokens instead of appending 40k. When the loop's queue crosses its budget, compaction evicts the stale exploration and pins the task. The run that crashed at 45k tokens completes inside a 20k budget -- not because the window grew, but because the loop stopped feeding the queue.

## What About Big Windows?

To be fair, there is a real case for big windows.

There are tasks where the payload *is* the problem. Feed a model a 300k-token legal document and ask a question that requires joint reasoning across its sections, and no amount of clever paging replaces having the whole document in view at once. One long document, a handful of calls, bounded growth: that is the regime where giant windows shine, and the results there are genuinely good.

Look at the shape of that regime, though. The input is bounded, the number of turns is small, and the growth rate of the queue is roughly zero. It is a single large allocation up front -- a static workload, not a dynamic one.

Agent loops are the opposite workload: unbounded producers, unbounded duration, unbounded fan-out. A bigger window helps the static case by definition. It does nothing for the dynamic case, because the queue grows to meet any capacity you give it. No model upgrade fixes that. When producers outpace the consumer's willingness to say no, latency and cost scale with whatever capacity you provide.

You will eventually need both: a big window for the allocations that deserve it, and flow control for everything else.

## Memory vs. Flow Control

Bigger windows are more memory. Backpressure is flow control. Memory says how much a system can hold; flow control decides whether it degrades gracefully when that amount is exceeded. One is a spec sheet number. The other is an architecture.

Agent frameworks are redoing, in 2026, the journey every messaging system took a decade ago -- from "we will just enqueue everything" to consumer groups, offsets, retention policies, and lag metrics. The destination is not in doubt. The only question is whether your loop learns it in a design doc or in a production incident.

The runtime should own the queue: budgets, truncation, compaction, deadlines. The model should own judgment: what to look at next, what matters, what to do. That is the same division of labor I keep coming back to -- deterministic machinery in code, probabilistic judgment in the model.

Your agent does not need a bigger bucket. It needs a valve.
