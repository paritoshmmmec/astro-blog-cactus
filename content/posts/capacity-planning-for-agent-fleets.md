---
external: false
title: "Capacity Planning for Agent Fleets"
description: "Agents are bursty, stateful, long-running tenants. Treating them like stateless request traffic produces idle spend and midnight pileups. Little's Law, head-of-line blocking, and sizing for p99 instead of average."
date: 2026-07-06
tags: ["agent", "reliability", "capacity-planning"]
---

Fleet outages in agent systems rarely look like outages. Nothing crashes. The queue simply grows: interactive sessions that answered in five seconds now answer in five minutes, subagents that spawned instantly sit pending, and someone eventually opens the metrics and asks why utilization says 40% while every user says the system is down.

The gap between 40% utilization and 100% user misery is not a monitoring failure. It is a category error: agent workloads have the queueing profile of long-running, stateful, bursty jobs, but they get provisioned like stateless request traffic -- sized for the average, scaled on CPU, surprised by the tail. The queueing theory needed to fix this is sixty years old, arithmetic rather than analysis, and every number it needs is already sitting in your agent traces. This post walks the three ideas that do most of the work.

## Little's Law, Read Honestly

The one law to memorize: in steady state, the average number of items in a system equals the arrival rate times the average time each spends there.

```txt
L = λ × W
```

In a request-serving world this law mostly confirms intuition. In an agent fleet it hides a trap, and the trap is *W* -- residence time. An HTTP request spends milliseconds in the system. An agent run spends minutes to hours: model turns chained end to end, tool calls, human approvals, subagent fan-out. A run is resident in your fleet the entire time, holding its worker, its context, its provisioned memory.

Do the arithmetic a fleet planner would. Two hundred agent runs arriving per hour, each resident for an average of eighteen minutes: the fleet holds, at any moment, sixty concurrent runs -- before a single burst. Provision thirty workers because "200/hour sounds small" and the law quietly tells you what you built: a queue that grows by thirty runs every hour, forever, until either arrivals drop or every run's residence time doubles because it is waiting for a worker. The classic death spiral, where waiting itself inflates residence time, which inflates the queue, which inflates waiting.

The practical consequences are unglamorous and non-negotiable. Measure residence time as *wall-clock from dispatch to completion*, not GPU seconds or token throughput -- approvals and tool latency count, because the worker is held either way. Estimate concurrency from the law before buying capacity, and re-estimate when the workload changes: an agent that gains a human-approval step has tripled its residence time even though its "compute" barely moved. The law is trivial; the discipline of feeding it wall-clock numbers is what fleets skip, at the cost of discovering the law empirically.

## Fan-Out Multiplies Everything

The single feature that most separates agent fleets from request fleets is fan-out: one user request becomes a parent run, which spawns three to ten subagents, each resident and each itself bursty. The multiplication lands on every term of the law at once.

Arrival rate: a spike of parent dispatches becomes a spike several times larger at the worker pool, delayed by the parent's own setup time -- which is why subagent queues surge *after* the interactive traffic has peaked, when the on-call has gone back to bed. Residence time: the parent is resident while it waits for its children, so a fan-out of five converts one 18-minute job into one worker held for 18 minutes plus five workers held for variable fractions of it. In-system count: the fleet's real concurrency requirement is the sum over the whole tree, not the count of root requests.

The failure mode specific to fan-out is head-of-line blocking. A worker pool shared between interactive sessions and batch subagent processing, FIFO-served, will eventually hand its workers to a wave of long batch runs while interactive sessions wait behind them -- five-second answers become five-minute answers, with utilization fine and no errors thrown. The fix is boring and standard, and agent fleets adopt it late because the traffic *looks* uniform until the first bad afternoon: separate pools or priority scheduling for interactive versus batch, admission control on fan-out width (a parent may spawn K children, not fifty), and the breaker discipline from June's post applied to subagent dispatch, so a dependency stall does not pin the whole tree.

There is a capacity-planning corollary worth stating as a rule: **size for the fan-out tree, alert on the root's wait time**. The number that maps to user pain is how long a root request waits before its first subagent does any work. Everything else in the tree is accounting.

## Sizing for p99, Not the Average

The last idea is the one the averages hide. Queueing delay is not linear in utilization -- it is roughly hyperbolic, waiting time scaling like 1/(1 − utilization). At 50% utilization, waits are modest. At 80%, they are four times the service time. At 95%, twenty times. At 99%, a hundred times -- which is why a fleet can average 40% utilization all month and still deliver a midnight pileup: *average* utilization is the wrong variable for a bursty arrival process, and agent arrivals are bursty by construction (cron-triggered pipelines, business-hours session spikes, deploy-triggered re-runs).

So capacity for agent fleets is a p99 exercise, and the method is older than the cloud: model the burst, not the mean. Peak concurrent runs -- fan-out trees included, wall-clock residence included -- during your worst honest hour; provision so that burst lands the fleet at the knee of the curve, not past it. If the honest number is unaffordable, the correct responses are the levers this series has already installed, all of which are capacity levers wearing other names: admission control (queue or reject *before* overload, rather than degrade everything mid-queue), residence-time reduction (the backpressure patterns that keep runs from ballooning), and preemption (batch work yields its workers when interactive traffic arrives -- requires journals and idempotency to be safe, which is precisely why the WAL post's machinery is a capacity feature too).

None of this requires believing any particular forecast. It requires the shift that separates capacity planning from capacity guessing: the fleet's behavior under load is governed by arithmetic that was old when it was applied to telephone switches, and the arithmetic has no exceptions for workloads that are fashionable. Measure wall-clock residence, respect the fan-out multiplier, provision for the burst -- and the 40%-utilized, user-miserable fleet becomes a design bug from an earlier draft, not a Monday morning.
