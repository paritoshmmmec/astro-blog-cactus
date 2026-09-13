---
external: false
title: "Leases Are the Missing Primitive for Multi-Agent Coordination"
description: "Multi-agent systems coordinate by convention—prompts, shared docs, please-don't-touch-this. Distributed systems solved this decades ago with leases. A lease is a bounded-time ownership claim that expires safely, and your agent framework needs one."
date: 2026-08-21
tags: ["agent", "reliability"]
---

Ask two engineers to describe how their agents avoid stepping on each other and, more often than not, the honest answer is: by asking nicely. The planner agent's prompt says which files belong to it. The coding agent is told, in prose, that another agent owns the database migrations. A shared markdown file sometimes serves as a notice board—"currently editing: auth-module"—updated by whichever agent remembers to update it.

This is coordination by convention, and it has the same failure profile as every convention-based system: it works until the day it matters. The prompt gets truncated. The notice board goes stale because the agent that was supposed to update it crashed first. The model, being probabilistic, sometimes ignores instructions that conflict with its current goal.

None of this is new. Engineers solved inter-process coordination decades ago, and the solution they converged on for the hardest part—ownership that must survive crashes and lies—is the lease. A lease is a bounded-time claim on a resource: acquire it, hold it while you work, prove liveness with a heartbeat, and if the heartbeat stops, the claim expires and the resource becomes available again. Etcd, Kubernetes, Chubby, ZooKeeper: every serious coordination system is, at its core, a lease manager.

Agent frameworks are now coordinating dozens of processes that crash, hang, lie, and fork—and they are doing it with markdown files. The primitive is missing. This post is about what goes wrong without it, what the primitive actually is, and what a Monday-morning implementation looks like.

## The Collision Catalog

Start with an honest inventory of what actually breaks when agents coordinate by convention. I have seen every one of these in the wild; the taxonomy matters because each failure maps to a different missing mechanism.

### The simultaneous edit

Two agents, both told in their prompts that they own the payments module, both start editing it in the same minute. Maybe the prompt was ambiguous. Maybe a supervisor dispatched both. The result is the merge conflict from hell, except neither agent notices, because both were told they were the owner and both believed it. File locks exist for this. Agent frameworks mostly do not use them, because the agents operate through tool calls that no lock is guarding.

### The stale notice

The shared coordination document says the auth service is being refactored by Agent B. Agent B died an hour ago (context overflow, most likely). The notice survives it. Agent C reads the notice, defers its own work, waits. Nothing expires, so nothing recovers. A claim without a timeout is not a claim; it is a rumor.

### The orphaned resource

A subagent acquires something (a dev server, a database transaction, a file lock) and then its parent cancels it. Nobody releases what it held. The resource leaks until a human goes looking. Systems that track ownership forget to track it across process death; the lease's answer, expiration, is precisely a mechanism for the tracker to be the survival layer rather than the process.

### The split brain

The subtlest one, and the most instructive. A supervisor dispatches Agent A on a task, then hears nothing: the connection drops, or A is just slow. The supervisor concludes A is dead and re-dispatches the same task to Agent B. Now two agents hold the same task, both believe it is theirs, and both start writing. A, of course, was never dead. This exact scenario, the uncertain death, is the canonical distributed-systems dilemma, and the reason the lease design below has a fence in it.

Every item on this list has a known fix, and the fixes compose into a single primitive. Here it is.

## The Anatomy of a Lease

A lease has four moving parts, and the whole design fits in a paragraph each. The running example: a coding agent claiming a file path before editing it, in a repo where several agents work concurrently.

### Acquire

To claim a resource, an agent writes a record: who I am, what I claim, and an expiry timestamp, all written atomically: one compare-and-swap, not a read-then-write. The atomicity is where the convention-based approach dies, because two agents updating a shared markdown file are doing exactly the read-then-write race that compare-and-swap eliminates.

```txt
acquire(resource, agent_id, ttl):
  if lease[resource] missing or expired:
    write lease[resource] = {agent: agent_id, expires: now + ttl}
    return ok
  else:
    return denied, current_holder
```

Note what a denial is: not an error, but information. "Agent B holds this for another 40 seconds" is exactly what a well-behaved agent needs in order to plan: wait, work on something else, or ask the supervisor to arbitrate. Coordination data is useful data.

### Heartbeat

While working, the holder renews the lease by rewriting the expiry to now plus ttl. Every N seconds of work, one tiny write. This is how the lease distinguishes "still working" from "gone": claims do not die when their holder dies; they die when their holder stops *renewing*. An agent doing a twenty-minute migration renews forty times; an agent that crashed at minute three renews zero.

### Expire

When the expiry passes with no renewal, the lease vanishes. No cleanup process required, no human noticing a stale notice board. Expiration is the recovery mechanism, and it is automatic in the way conventions never are.

### Reclaim

Any other agent can now acquire the resource. Importantly, reclaim is ordinary acquire; there is no special ceremony, because expiration already did the hard part.

The whole mechanism is maybe fifty lines over any key-value store with compare-and-swap: etcd, ZooKeeper, even a Postgres row with a `WHERE expires < now()` guard. Which raises the fair question: if it is this old and this small, why is it missing?

## The Split-Brain Fence

Because the naive version has a hole, and the hole is the interesting part.

Return to the split brain. Agent A holds a lease on the migrations directory, with a sixty-second ttl, and is mid-way through a delicate edit when it hits a pause (garbage collection, a slow tool call, a context compaction) that runs ninety seconds. Its lease expires. Agent B reclaims and starts editing. A resumes, still believing it holds the claim. Both proceed. The lease expired *correctly*, since A really was silent for ninety seconds, and the race happened anyway, because A never learned that it lost.

The lease protects the resource from the world; it does not protect an owner from its own stale belief. For that, the lease needs one more component: a fence.

The fix is a monotonically increasing token (a number) handed out at every acquire, and checked at every write. A gets fence token 7. B's reclaim hands out token 8. When A resumes and asks its storage layer to write, the storage layer refuses: the last write it saw came from token 8, and 7 is smaller. A's stale belief is now structurally harmless: it can shout all it wants; the resource stops listening to expired claims.

This is not a clever new trick. It is the fencing scheme from Kleppmann's *Designing Data-Intensive Applications*, where it is presented as the answer to exactly this scenario with lock servers. The agents case adds a twist that makes fencing *more* natural, not less. A human process holding a stale lock writes bytes; bytes cannot check their own fence. An agent's writes flow through a tool-call layer: a runtime, in the sense I have argued for before, where deterministic machinery owns control flow and the model only supplies judgment. That runtime can check the token on every call. Agents compose with infrastructure better than processes do. The fence slots into a layer that already exists.

The fence also resolves a question that comes up the moment leases get serious: should an agent that discovers its lease expired *stop*, or *finish*? The principled answer is: its writes stop mattering either way. The agent can finish its computation, report what it found, even prepare a patch, but the fenced storage layer refuses to apply anything from an expired claim. Progress becomes a property of the system, not of the agent's self-discipline. That is the difference between a mechanism and a convention one more time.

## What This Looks Like on Monday

Everything above composes into a design small enough to build this week. No new infrastructure: etcd, Postgres, or even a properly-guarded Redis does the job. The design, end to end:

### A lease table

One row per resource: resource, holder, fence token, expiry. Resources are whatever your agents fight over: file paths, database migration locks, dev servers, the right to run the test suite, task claims from a work queue.

### A runtime wrapper

Around the tool layer, not the model, doing the work: acquire before any claiming tool call, heartbeat in the background while the agent runs, check the fence on every write-shaped call. The model never manages the lease. It cannot be trusted with it, and it does not need to be: the lease is infrastructure, closer to a disk quota than to a rule the model must remember. The model experiences it as an environment property: sometimes a tool call comes back "denied, held by agent-b for 40s", and that is all it ever sees.

### Prompts that consume denial, not prevent collision

This is the part that changes how the agents feel. Today's convention-based prompts spend their budget on preemptive rules: "never touch auth-module, that belongs to another agent." With leases, those rules shrink to one: "if a claim is denied, wait, pick different work, or escalate." The model is good at exactly this kind of local decision-making, and it no longer needs to be good at global bookkeeping, which it was never reliable at anyway. Move the bookkeeping into the runtime; leave the judgment about what to do with a denial to the model. It is the same division of labor as every post in this series: deterministic machinery in code, probabilistic judgment in the model.

### Task dispatch gets leases for free

The supervisor's re-dispatch problem (never sure whether a worker died) becomes an ordinary lease claim on the task itself. A worker claims task 42 with a heartbeat; if it stalls past expiry, the task re-enters the queue, and the fence token stops the stalled worker's late writes from corrupting the replacement's. Idempotency and liveness in one mechanism, and no more waiting forever on a peer that died.

There is a deeper point underneath the implementation. The reason convention-based coordination feels acceptable at first is that small numbers of agents make collisions rare, and rarity reads as safety, the same trap as the unbounded context window, which works fine until the run that matters. Leases invert the economics: they make the safe path the cheap path. The well-behaved agent pays one small write every few seconds. The misbehaving one (crashed, stalled, or stubborn) is stopped by arithmetic rather than by anyone's good intentions.

Multi-agent systems are here, and they are being asked to coordinate real work over real resources. They are missing the one primitive that was built for exactly this job: a primitive that is fifty years old, fifty lines deep, and already running underneath most of the infrastructure those agents call. It is time to give it to them.
