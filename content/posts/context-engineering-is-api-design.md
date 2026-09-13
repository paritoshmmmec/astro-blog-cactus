---
external: false
title: "Context Engineering Is API Design"
description: "What you put in context, in what order, with what volatility, is an API contract—between your components, and between runs. Schema-first thinking for prompts: versioned templates, stable prefixes, changelogs, diffs."
date: 2026-05-23
tags: ["agent", "design", "llm"]
---

"Context engineering" has become the polite replacement for "prompt engineering," which is progress of a sort—the problem was never just the prompt, it is everything that surrounds the prompt inside the window. But most writing on the subject treats it as a bag of tricks: put the instructions here, use XML tags there, add an example or two. Tricks do not survive contact with a team, a codebase, or a second model provider.

Here is the frame that does survive: a context window is an interface, and everything you put in it is an API call. The caller is your application. The callee is a probabilistic function you do not control and cannot inspect. And like every API that matters, the context needs the unglamorous machinery engineers spent fifty years building for other interfaces—schemas, versioning, changelogs, diff review, deprecation policy. Teams would not ship a REST endpoint managed as a string in someone's head. They ship contexts managed exactly that way, daily.

## The Contract Has Three Parties

The first step is being precise about who depends on what, because there are more parties than "the prompt and the model."

### The model depends on the shape

Order, structure, and phrasing in the context are load-bearing. Move the system prompt after the conversation and behavior shifts; reformat a tool schema and call quality shifts. Nobody at the provider promises otherwise, because nobody at the provider controls it either—model updates change what shapes work best, silently.

### Your own components depend on the contract

The context is assembled from many sources: system instructions, tool schemas, retrieved documents, conversation history, user input. Each source has a producer somewhere in your codebase. When producer and assembler share no schema—when the context is a string built by string concatenation—every producer can break every other producer, and nothing will catch it before the model does. The model is your integration test that always passes, even when it should fail: it will happily accept a malformed context and produce confident nonsense.

### Your future self depends on reproducibility

The worst failure mode of context-as-string is not that it breaks today. It is that when quality drops—and someday it drops—you cannot answer the question "what changed?" Was it the model? The retrieval? A template edit from three weeks ago that nobody logged? Without an answer, every regression is an archaeology project.

## Version Templates Like Interfaces

Once the contract view is adopted, the mechanics are mostly standard engineering, ported over.

### Schemas, not strings

A context template should be a structured object—typed slots for system instructions, tool definitions, retrieved content, history—serialized at the last responsible moment. The serialization rules are then explicit: JSON keys sorted, timestamps not embedded, volatile content only in designated slots. If that list sounds familiar, it is the prefix-caching discipline from May's post on prompt caches, arrived at independently from the other direction: what is good for the cache is good for the contract, because both reward determinism.

### Versions, with deprecation

Template changes should be versioned, so that a run can be pinned to the template version that produced it. When you change a template, the old version enters a deprecation window: eval suites run against both, traffic can be split, and any quality delta gets attributed to the change rather than to the vibes of the week. This is exactly how API providers treat breaking changes, for exactly the same reason.

### Changelogs and diff review

A one-line edit to a system prompt can move production behavior more than a model upgrade. Such edits should go through review like code—a diff, a reviewer, a comment saying why. The review cost is minutes; the alternative is discovering the edit retroactively, by bisecting behavior. Teams that write "prompt changelog" files universally report the same surprise: how often the answer to "what changed?" was "something someone edited on a Tuesday and did not mention."

## Test the Interface, Not the Vibes

The contract view also settles what an eval suite is for, at the template level. Between "the model got better" and "our prompts got worse" stands an interface that can be regression-tested on its own.

### Golden fixtures

A set of frozen inputs—user requests, retrieved documents, tool states—paired with the exact serialized context they produce. Serialization is deterministic; the fixture test is therefore a plain equality check. It catches the producer bugs: the unsorted keys, the newly embedded timestamp, the tool schema that changed shape because a dependency upgraded.

### Canary contexts

When a template version ships, run it against the fixtures and diff the serialized bytes. Then run the eval suite against the *model* with both versions. The first diff explains behavioral deltas that look mysterious; the second quantifies them. Neither step requires new infrastructure—both require the contract mindset that makes them obvious.

### Monitor the shape in production

Log the template version and the context hash with every run. A histogram of context sizes; an alert when a supposedly-stable prefix's hash changes. These are the health checks of the interface, and they are cheap precisely because the interface is deterministic. A cache hit-rate drop is the provider telling you your prefix changed; with hashes logged, you can answer where and why.

## The Judgment Stays Probabilistic

None of this mechanizes the content of the context—what to say to the model remains a judgment problem, and the teams that treat templates as frozen infrastructure stop improving them, which is its own failure mode. The design still needs experimentation: reorderings, phrasings, added examples. The contract view does not forbid experimentation. It prices it honestly. Change the interface deliberately, measure against a version, keep the diff reviewable—and roll back when the delta goes the wrong way, the way every other interface in software is managed.

The window is an API. The model is an unversioned dependency that you get to update only when the provider says so—which is precisely why the part you do control should stop being a string in someone's head.
