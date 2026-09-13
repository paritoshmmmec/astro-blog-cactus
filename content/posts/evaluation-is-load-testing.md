---
external: false
title: "Evaluation Is Load Testing"
description: "Teams don't trust model changes for the same reason teams didn't trust deploys before CI: no cheap, repeatable signal. Eval suites are load tests -- fixtures, budgets, regression gates, canaries. What transfers from performance engineering, and what doesn't."
date: 2026-07-17
tags: ["agent", "evaluation", "testing"]
---

Before continuous integration, software teams had a ritual: the release candidate goes to a staging machine, a human clicks through the main flows, and everyone holds their breath. Deploys were scary because the signal was expensive -- one manual pass, hours before feedback, no baseline to compare against. Then automated tests made the signal cheap, and deploys became boring. Not safer tools. Not more careful humans. Just: the cost of *checking* fell below the cost of *worrying*, and behavior changed.

Model-powered features are living in the pre-CI era. Teams ship prompt changes, model upgrades, and agent-framework rewrites with a manual smoke test and a sense of dread, because their checking signal is a handful of ad-hoc runs and a vibe. The industry's name for the fix is "evals," which sounds like a new discipline. It is not. It is load testing -- performance engineering for a system whose output is stochastic -- and nearly everything teams need has a direct analogue in a discipline they already trust. This post is the mapping, plus the honest list of what does *not* transfer.

## Fixtures: The Golden Set

Load testing starts with recorded traffic -- realistic request/response pairs you can replay deterministically. The eval equivalent is the golden set: a frozen collection of inputs your system actually receives, saved alongside everything needed to reproduce a run exactly. Not invented examples, not demo queries -- *recorded* traffic, ideally sampled from production, spanning the easy cases and the weird ones.

Two properties matter more than size. Coverage of the tail: the golden set that only contains happy paths will pass forever and protect nothing, so curate the failures -- every production incident should donate its input to the set, the way outage postmortems feed load tests. And *freezing*: inputs are pinned versions, not live queries, because a benchmark whose inputs move cannot tell you whether your system changed. If the inputs include retrieved documents or tool states, snapshot those too; a fixture with a moving part is a fixture with an alibi.

The contract view of contexts from May's post is what makes fixture freezing practical -- contexts that are deterministic can be hashed, stored, and replayed exactly. Teams without that determinism will find that their "same" eval run differs by the retrieval corpus drifting underneath it.

## Budgets: Numbers Instead of Vibes

A load test without a pass threshold is a demo. The threshold's eval analogue is the quality budget: numeric scores on defined metrics, with named acceptable bands. The metrics are embarrassingly mundane and that is their virtue -- task success rate judged by rubric, exact-match rates where ground truth exists, cost per task in dollars, wall-clock p50 and p99, tool-call error rates, the cache hit rate from the prefix post. Every one is computable from logged runs; none requires a research background.

What budgets buy is the ability to say a specific sentence: "the new template costs 4% more tokens and improves success by 11%, within budget." Without budgets the same change is argued about for a week by people with different intuitions. The bands are set the way SLOs are set -- from what production currently delivers, tightened over time -- and they cover regressions asymmetrically: a 2% success-rate drop on the tail cases is a louder event than a 2% cost increase.

One budget deserves special mention because agent teams routinely forget it: *variance*. Run the same suite twice against the same model and the scores will differ -- sampling temperature, provider-side nondeterminism, retrieval drift. That spread is noise, and its measured size is the minimum detectable effect of any comparison. Teams that skip this run "experiments" whose entire delta is smaller than the noise floor, and ship accordingly. Load testers learned this as run-to-run variance decades ago; the eval version is newer and more severe, and it is why every honest eval suite runs each fixture several times.

## Gates and Canaries: The Deploy Path

With fixtures and budgets, the CI shape assembles itself. A regression gate runs the suite on every change to a template, a tool contract, or a framework version, and blocks the merge on budget violations -- the same trust a test suite earns, no more magical. The subtlety specific to models is *what counts as a change*: model providers update their endpoints silently, so the suite also runs on a schedule against production endpoints, unattended, catching the upgrades nobody announced. A scheduled suite is the eval equivalent of synthetic monitoring, and it is the only defense that works against a dependency you cannot version-pin.

Canarying maps over cleanly: route a small slice of production traffic to the candidate configuration -- new template, new model, new agent runtime -- and compare its live budgets against the incumbent's. The golden set is a proxy; the canary is the ground truth; both are needed, in that order. And like load tests, the whole apparatus must itself be maintained: golden sets go stale as traffic shifts, rubrics drift, and a suite that passes 100% for months is usually telling you it has stopped listening. Rotating in fresh recorded traffic on a schedule is the eval version of refreshing load-test recordings.

## What Does Not Transfer

The honest section, because the differences are where teams get burned.

### The oracle is fuzzy

A load test knows correctness: latency under X, error rate under Y. Many agent tasks have no exact answer -- "a good summary" resists assert-equals -- so rubric-judged scoring enters the stack, with its own noise and its own need for calibration. Judged-by-another-model scoring scales well and must itself be eval'd against human labels periodically, or the grader becomes an unmonitored dependency, which is the one thing this whole discipline exists to prevent.

### The system under test has opinions

A service under load behaves deterministically given the same requests; a model under the same prompt does not. This is why variance budgets exist, why comparisons need paired runs, and why "it failed once" is evidence, not verdict.

### The test can contaminate

Load tests do not teach the service to behave differently. But published benchmarks leak into training data, and internal evals repeated often enough become optimization targets -- an agent tuned against the same golden set for a year is tuned to the test, not the task. The defense is the same one performance teams use for vendor benchmarks: hold out a private set, rotate, and treat any suspiciously perfect score as a measurement problem first.

The pre-CI era ended when checking became cheaper than worrying. For model-driven features, the parts are all on the shelf: fixtures, budgets, gates, canaries, variance floors. What is missing is rarely the tooling. It is the decision to treat a probabilistic system with the same unromantic discipline as a fleet under load -- because dread, it turns out, was never about the deploys.
