---
external: false
title: "Circuit Breakers for Tool Dependencies"
description: "An agent calling a dying API will hammer it harder, not softer, because its loop cannot tell one failure from an outage. The circuit breaker pattern ports to tool calls—with a twist: LLM retry creativity defeats naive trip conditions."
date: 2026-06-14
tags: ["agent", "reliability"]
---

Here is a failure sequence I have watched play out more than once. An agent's tool call to some external service starts failing. The agent does what its prompt says: "if a call fails, retry, then try an alternative approach." It retries. Fails. Tries an alternative approach, which is *another call to the same service*, differently worded. Fails. Reformats the payload. Fails. Switches to a related tool that, it turns out, calls the same downstream service. Fails. All of this is logged as normal agent behavior, because each individual call is unremarkable.

What the agent has actually done is discover, through exhaustive probing, that the service is down. It has told no one, learned nothing globally, and spent its own budget generating the news. A human operator in the same situation trips a breaker within minutes: after the third identical failure, the service is marked down, alerts fire, and everyone stops paying it attention until it recovers.

The pattern has a name and a fifty-year pedigree. Circuit breakers (closed, open, half-open) are how resilient systems call dependencies that can fail. They port to agent tool calls with almost no ceremony, with one genuinely new wrinkle: the retry creativity that makes agents feel intelligent is exactly what defeats a naive breaker. This post is the port.

## The Three States, Briefly

A circuit breaker sits between a caller and a dependency and tracks failure *rate* over a sliding window. Three states:

- **Closed**—normal operation; calls flow; failures are counted.
- **Open**—the trip threshold was hit; calls are rejected immediately without touching the dependency, for a cooldown period. Rejection is cheap, instant, and honest: "this dependency is down, do not wait on it."
- **Half-open**—the cooldown elapsed; a small number of probe calls are let through. Success closes the circuit; failure reopens it.

The point of the machinery is the thing it does to failure semantics. Without a breaker, every failure is discovered at full price: the caller waits through the timeout, burns the retry budget, and experiences the outage *serially*, one call at a time. With a breaker, the first few calls pay the discovery cost and everyone after that pays nothing. The outage becomes a state, not a stream of coincidences.

Any agent loop whose tools call remote services (and whose does not) wants this state machine wrapped around each dependency. The interesting questions are all in the details.

## Detail One: Trip on Rate, Not Count

"Fail three times, trip" is the naive version, and it is wrong in both directions for agents.

Too eager: some tools fail intermittently by design (a search API with noisy tail latency, a scraper hitting sites that are individually flaky). An agent doing a hundred calls will see three failures in a healthy hour. Tripping there turns a usable dependency into an unusable one.

Too slow: an agent that batches its calls (five parallel subagent calls to the same API, all timing out together) can accumulate a dozen failures in one wave, then go quiet for ten minutes while the model reasons. A count-based window sees ten failures and trips; a rate-based window with a minimum sample size sees ten failures out of a large-enough recent history and correctly declines to panic.

The agent-appropriate rule is the rate-limit rule from every sane production breaker: trip when the failure rate over a sliding window exceeds a threshold, with a minimum number of samples before the rate means anything. Failure counts without denominators are how breakers get a reputation for flapping.

## Detail Two: The Creativity Problem

Now the wrinkle that makes agents different from every other caller a breaker has ever wrapped.

A conventional client retries by *repeating*: same request, same endpoint, exponential backoff. Trip conditions keyed on identical failures work fine against that; the repeats are easy to cluster.

An LLM "retries" by *varying*. The tool call failed, so the model re-reads the schema and reformats the payload. It tries a different parameter spelling. It chains a different tool that hits the same backend. It writes a completely new query that is semantically the same request. Each of these looks, to a naive breaker keyed on "identical request failed," like a *new* kind of call. The breaker never trips, because no individual failure signature repeats, while the dependency is being probed continuously under an unbounded variety of disguises.

This is the creativity problem, and it inverts the usual framing: the model's flexibility, which is its virtue at reasoning time, is a liability at the infrastructure layer. The fix is to key the breaker on the *dependency*, not on the request. The breaker tracks failures per downstream target (host, service, API key, tool implementation) regardless of how the request to it was phrased. Two differently-worded calls that both hit `search-api.internal` are the same breaker's business. The runtime knows which dependency a tool call maps to; the model does not need to, and should not be asked to.

The corollary is that the breaker lives in the runtime's tool-execution layer—the same layer that owns budgets, leases, and idempotency keys—for the same reason all of those live there. The model cannot be trusted to maintain infrastructure state, and it does not need to be.

## Detail Three: Tell the Model

An open circuit is information the agent can act on—but only if the agent receives it. This is the step most ports forget, and for agents it is the difference between a breaker that saves the run and one that merely saves the dependency.

The mechanics are simple: when a call is rejected by an open circuit, the tool result is not a stack trace but a structured, model-readable notice—"dependency X is circuit-open; cooldown remaining: 40s; suggest: do not call X, or plan without it." Structured errors, in the sense argued in the tools post, are what make this possible; a breaker that trips and then reports in prose has merely moved the noise.

What the model does with the notice is the judgment layer, and this is where the division of labor pays off. The model can genuinely help here: it can re-plan around the dead dependency, work on a different subtask, defer the branch, or tell the user—choices that require understanding the *task*, which the runtime lacks. What it cannot do is decide *whether the dependency is down*; that verdict belongs to the breaker's arithmetic. Infrastructure rules; judgment adapts. A model asked to make the infrastructure call will hedge, half-trust, and hammer; a model *told* the circuit is open, in its own vocabulary, adapts impressively well.

The last piece is the feedback loop upward. Breaker state belongs in the run's observability—trip events, state transitions, rejected-call counts—and in the supervisor's view of its subagents. An agent that spent its whole budget probing an open circuit is a run that failed *for a known reason*, and a fleet that trips breakers on a particular dependency every afternoon is telling you something about a vendor. The breaker's logs are the cheapest capacity-planning signal you will ever collect.

## The Cheap Insurance

There is a reason this pattern survived from telephony switchgear through Netflix's Hystrix era to every modern service mesh: it is small. A sliding window, a threshold, a cooldown timer, a probe. Few hundred lines, no infrastructure, wrapped around each tool dependency in the execution layer.

And the alternative is the sequence this post opened with, repeating at scale: every agent in a fleet independently discovering the same outage, serially, at full price, with no shared memory of the discovery. The breaker is not just protection for one loop. It is how a fleet stops learning the same bad news all at once.
