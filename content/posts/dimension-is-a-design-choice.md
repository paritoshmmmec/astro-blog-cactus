---
external: false
title: "Dimension Is a Design Choice"
description: "384 vs 1,536 vs 3,072 embedding dimensions: what each buys, what each costs, and why more dimensions does not mean more meaning. Dimension is a budget, spent like any other."
date: 2026-07-28
tags: ["embeddings", "math", "design"]
---

Ask a team why they chose a 1,536-dimensional embedding model and the honest answer, more often than not, is: it was the default. The flagship model has the most dimensions, the most dimensions feel like the most intelligence, and dimension-count has become the megahertz of the embedding world, a spec-sheet number that reads as quality and is read as a target.

The geometry says otherwise. Dimension is not a quality grade. It is a *budget*—the number of independent directions your vectors get—and every direction is purchased twice: once in memory and latency, once in the statistical tax that high dimension levies on anyone who must estimate from finite data. The right question was never "how many dimensions is best?" but "what am I spending them on?" This post is a buyer's guide to that budget.

## What Dimensions Buy

Start with what the number actually grants you, because the geometry from the Infinite Dimensions post constrains it from both sides.

The near-orthogonality fact (random vectors in d dimensions concentrate around zero cosine, in a band of roughly ±1/√d) sets the ceiling on capacity. To have N concepts each safely distinguishable by direction, you need enough dimensions that the separation band stays narrow relative to the signal you care about. Rough working intuition from the Johnson-Lindenstrauss lemma: preserving the structure of N points to reasonable fidelity needs on the order of log(N) dimensions—a logarithm, not a multiple, which is why 384 dimensions can already hold hundreds of thousands of usefully-separated points. Capacity scales *slowly* with d. The first few hundred dimensions buy enormous separability; each additional thousand buys comparatively little headroom, and the megahertz intuition ("twice the dimensions, twice the meaning") is off by the width of the whole discipline.

What the extra dimensions *actually* buy is granularity of detail, not count of concepts. Higher-dimensional embedding models typically encode finer distinctions: register and tone, relations versus entities, the difference between a paraphrase and an implication. That is a real benefit (retrieval quality on subtle queries genuinely improves), but it is a benefit with a cost curve attached, and the curve has two legs.

## What Dimensions Cost

### The leg everyone prices: storage and compute

Index memory, vector size, distance-computation time all scale linearly with d. A million-vector collection at 1,536 dimensions is ~6GB of float32; at 384 it is 1.5GB; at a provider's 3,072 it is 12. Query latency on exact search scales the same way, and even approximate indexes feel d in their build times and their graph degree. This leg is boring and finite and you already know it.

### The leg everyone forgets: the statistical tax

More dimensions means more parameters to estimate from the same finite training signal, and the concentration facts cut against you as d rises: distances between random points cluster into a narrow band, so the *signal* (the difference between a relevant and an irrelevant document) occupies a shrinking fraction of the distance distribution. Whether a given model escapes this is an empirical question about its training, not a law; but the burden moves the wrong way as d grows. The practical symptom: distance values that all look alike, similarity thresholds that stop transferring between domains, and rerankers becoming mandatory to recover the contrast that dimension-count diluted. The curse of dimensionality is not a horror story; it is an invoice.

There is a third cost hiding in vendor switching. Dimension-count couples you to a model family: you cannot move to a better, differently-sized model without re-embedding the corpus, because vectors from different models do not share a space (a 1,536-dimensional vector from provider A and one from provider B are not neighbors, and neither is anything about them comparable). The dimension budget is a component-coupling budget too.

## Choosing Like an Engineer

Once it is a budget, the choice gets method: measure the marginal return and stop where it flattens.

The procedure is unromantic. Take your real queries (recorded production traffic, per the golden-set discipline) and a candidate list of embedding models across the dimension range: a 384, a 768, a 1,536, a 3,072 if budget allows. Embed the corpus with each. Run your retrieval evals (the load-testing discipline, with variance floors) against each candidate. Plot quality against dimension and against dollar. The plot will flatten; it always does, because the JL ceiling and the statistical tax push the curve from both sides. Where it flattens *for your queries* is your answer, and it is often two or four times smaller than the default.

Two refinements earn their keep. First, matryoshka embeddings (models trained so that leading sub-vectors are themselves usable) turn the dimension budget into a *runtime* dial: embed once at full width, store 384 leading dimensions for cheap first-pass retrieval, re-score survivors at full width. The two-stage pattern recovers most of the quality at a fraction of the index cost, and it is the closest thing the field has to a free lunch. Second, binary and int8 quantization change the storage leg by an order of magnitude, and their quality tax is small exactly when your contrast budget is healthy—another reason not to spend dimensions you do not need.

And the deciding principle underneath the procedure, the one worth carrying out of this post: dimension-count is fidelity of *representation*, not intelligence of *model*. The intelligence lives in training (data, objective, loss shaping), and a beautifully trained 768-dimensional model embarrasses a carelessly trained 3,072 on every query that matters. Megahertz died as a proxy when architects started measuring workloads instead of spec sheets. Dimension is next.
