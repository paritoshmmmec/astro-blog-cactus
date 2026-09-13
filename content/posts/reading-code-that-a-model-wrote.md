---
external: false
title: "Reading Code That a Model Wrote: A Field Guide"
description: "Code review didn't die when models started writing code; it changed substrate. What to actually check when the author is probabilistic -- and why every caught defect calibrates you against that model's failure shape."
date: 2026-08-14
tags: ["agent", "design", "testing"]
---

A model writes a function. It is clean. Docstring present, types hinted, the naming idiomatic, the structure exactly what a senior engineer would produce. You approve it. Three weeks later production discovers the function calls `date.subtract()` -- a method that does not exist in that library, and never has.

This is the review problem of the moment, stated in one anecdote: model-written code is the first code in engineering history whose *surface quality* is uncorrelated with its correctness. Human bad code looks bad -- tangled, uncommented, oddly named -- and experience reading humans trains you to route attention toward the ugly parts. Models generate the opposite regime: confident, idiomatic surfaces over a defect distribution you have not been trained to find. The skill is not dead; its attention map is. This post is a new one, built from the failure shapes models actually have.

## The Five Failure Shapes

### Invented interfaces

The model cites an API that plausibly exists: a method name, a config key, a flag with a confident name and no existence. This is the defect the anecdote showed, and it is the most common of the class. It looks like a typo; it is a memory artifact -- the model has blended two libraries' conventions into one plausible chimera. Humans do this too, but rarely with such clean syntax, which is why the human-trained eye glides past it.

### Plausible wrong logic

The boundary condition off by one -- but only on the boundary a comment claims is handled. The retry loop that is correct except for the case where the first attempt *partially* succeeded. The sort comparator that works for the docstring's example and inverts on ties. These are ordinary human bugs made denser: models compress the distribution of "code that looks finished," so the gap between looks-finished and is-correct widens exactly where review attention was already thinnest.

### The stale assumption

The code is *correct* -- for the version of the world in the training data. The deprecated auth flow, the API parameter renamed two years ago, the security advice the industry has since reversed. The code reads like 2023's best practice, because it is; the model's world model has a publication date. Your reviewer instinct cannot catch this by reading, only by comparing against the current world -- which makes this the one failure shape that gets *worse* as models improve at everything else.

### Hallucinated context

The model invents infrastructure: calls a helper that exists in some other repo, assumes a global that nothing defines, imports a module your project does not have -- or, subtler, writes code that assumes a different project's conventions, because the task description resembled something from training. Human reviews catch this in the first compile. Agent-run code often does not compile at review time, which moves the discovery cost downstream to where it is most expensive.

### The confident omission

No error handling where the failure mode is routine. No test for the case the function is named after. Missing nil-checks on the exact input the docstring says may be empty. Omissions are the cheapest defects for a generator to make and the most expensive to notice, because review attention follows what is *present*.

## The Field Guide

The failure shapes suggest their own review order -- attention routed by shape, not by ugliness.

### Compile and run before reading

The trivial mechanical rule that catches invented interfaces, hallucinated context, and import errors at zero reviewer cost. Agent-generated code should arrive *pre-verified* by its generator -- tests run, types checked -- as part of the generation contract, not the review contract. Anything that does not compile does not get human attention; it goes back. (This is the bounded-contract idea from the tools post, applied to the model as a tool.)

### Diff against the world, not against memory

For every external call -- library function, API, config key -- the review question is not "does this look right?" but "does this exist *here*?" A reviewer with the library's current docs one keystroke away catches stale assumptions and chimeras in seconds. This is the highest-yield habit on the list, because the failure is binary and cheap to check: exists, or does not.

### Read boundaries and money paths first

Where the failure shapes cluster: input validation, error paths, retry and cancellation logic, anything touching external state, anything irreversible. Read the happy path *last* -- it is the part the model writes best and the part least likely to hold the defect. This inverts human review habit, which starts at the top of the file and reads forward, spending attention in proportion to narrative interest rather than risk.

### Review the tests adversarially

Model-written tests pass by construction and prove almost nothing about their own strength. The review question is "what would make this test fail?" -- if the honest answer is "only the function it calls," the test is a smoke detector with the battery removed. Assert on outputs, not on absence of exceptions; cover the boundary the function's name advertises; delete any test that passes against a stubbed implementation.

### Track the failure shape you catch

The calibration loop is the part with compounding returns: when review catches an invented interface or a stale assumption, record which model, which shape. Over weeks this builds the failure *distribution* of the models you use -- which is stable enough to be actionable, and shifts exactly when the provider ships an update. Every caught defect is a datum; teams that collect them get review checklists that are actually about their models rather than about code in general.

## The Deal

None of this is an argument against model-written code, and it is worth being precise about why. The defect *rate* of model code is, for a widening class of tasks, comparable to or better than the human baseline -- and unlike human output, the generation is cheap enough that the review can afford to be thorough on everything, not just on the scary modules. The deal models offer is: more code, higher surface polish, a shifted and *learnable* defect distribution, in exchange for reviewers who retrain their attention once and then calibrate continuously.

Human review did not die. It changed substrate -- from style-reading to world-checking, from the top of the file to the boundaries, from vibes to a kept log of what each model gets wrong. That was always what review was for. The polish was never the point.
