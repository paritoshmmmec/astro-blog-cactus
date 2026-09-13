---
external: false
title: "The Kernel Trick, or: Geometry You Never Have to Visit"description: "Compute inner products in a million-dimensional feature space without ever going there. Kernels are the final substitute from the Infinite Dimensions post: geometry by algebra, taken to its limit. Attention is the same move, still paying off."
date: 2026-09-13
tags: ["math", "embeddings", "history"]
---

The Infinite Dimensions post ended with a list of substitutes for seeing—analogy, shadows, unfolding, slicing, arithmetic-as-sight—and left one move unnamed, because it deserves its own post. It is the most extreme substitution in the whole tradition: a way of doing geometry in a space you never construct, never store, never visit. Mathematicians call it the kernel trick. The description is cheaper than you would expect: it is inner products by alchemy, and it is the reason a 1998 algorithm (SVMs, in the form John Platt's SMO made trainable that year) was still winning on tabular data in the 2010s.

## The Setup: A Line You Cannot Draw

Start with the problem kernels were invented to dodge.

Some datasets are not separable in their own coordinates. Points that are "one class" and "the other" interleave in the plane (concentric rings is the textbook picture), and no straight line separates them. The classical escape is *feature mapping*: lift the data into a richer space where a line suffices. Two rings in 2D become two separable clusters in 3D the moment you add a height coordinate, z = x² + y²; the rings are stacked. The lifting map, φ, is the feature map, and the new space is the feature space. Linear methods in that space are curved methods back home.

The cost is the problem. If you want the lift to be expressive enough for real data, the feature space gets *big*: polynomial features blow up combinatorially, and the full quadratic interaction map on 1,000 raw features already has ~500,000 coordinates. Build the lifted vectors, store them, compute dot products in them, and the feature space's dimension bills you for everything. For truly expressive maps the dimension is not merely large but *infinite*, which sounds like a joke configuration until you meet the map that makes it literal.

## The Trick

In 1909, James Mercer published a theorem that sat quietly for sixty years before machine learning weaponized it. The statement, stripped to its use: for a large family of functions K (including the Gaussian) there exists some feature map φ such that

```txt
K(x, y) = ⟨φ(x), φ(y)⟩
```

for every pair of points. The Gaussian kernel, K(x, y) = exp(−‖x − y‖²/2σ²), corresponds to a feature map into *infinite-dimensional* space. Corresponds. Exists. Defined by the theorem. You will never see it.

The kernel trick is the decision to use this equality in reverse: never compute φ at all. Any algorithm that touches its data *only through inner products* can have those inner products replaced by K(x, y) evaluations (a cheap, closed-form function on the original coordinates) and thereby runs, in full mathematical rigor, in a feature space of unbounded dimension. The storage is still n data points. The per-pair cost is one exponential. The geometry is infinite-dimensional.

What "only through inner products" buys is worth savoring, because it is a constraint with a topology-shaped payload. Angles, distances, projections, margins, variance: all of it is computable from the Gram matrix, the n×n table of every pairwise K(xᵢ, xⱼ). The table *is* the geometry. A million-dimensional space, summarized by its overlap structure, no coordinates requested. This is the arithmetic-as-sight substitute from the Infinite Dimensions post completed: not merely doing the arithmetic because pictures fail, but discovering that the arithmetic was the only part the geometry ever needed.

## What Got Built on It

The support vector machine is the trick's flagship: maximum-margin classification where the margin is defined by inner products in the (possibly infinite) feature space, with the Gaussian kernel making the decision boundary in raw space arbitrarily curved. Through the 2000s, SVMs with Gaussian kernels were the default answer to every small-data classification problem, and Gaussian-process regression (the Bayesian sibling) powered everything from robotics controllers to astrophysical emitters on the same substrate. Kernel methods were, for fifteen years, what "classical ML" meant.

Then deep learning happened, and the standard telling is that kernels lost because representation *learning* beat representation *selection*: hand-picking a kernel is fixing the feature map in advance, and letting data choose features wins given data and compute enough. That telling is correct and, for this blog's argument, beside the deeper continuity, because the trick's core move did not lose at all. It moved.

Look at attention, the mechanism transformers run on. Each query computes a similarity score against every key (a compatibility between two vectors) and mixes values weighted by those scores. Nothing in that computation needs or uses coordinates *as* coordinates; it uses the objects only through their pairwise compatibilities, exactly the Gram-matrix regime. Scaled dot-product attention is literally an inner-product kernel on query and key vectors; the standard kernel-method toolkit (centering, normalizing, low-rank approximations of the Gram matrix) transfers onto attention with the translations made explicit by a wave of 2020-21 research that built linear-time attention *as* kernel methods. And the deeper echo is architectural: an SVM with a fixed kernel does geometry in a space it never visits, and a transformer learns its own feature maps (query, key, value projections) whose entire interaction is inner products. The trick's constraint became the architecture's design.

There is even a formal bridge for the exponentials themselves. Random Fourier features (Rahimi & Recht, 2007) give the Gaussian kernel a *finite* explicit feature map: sample random frequency vectors, lift each point into cos/sin features at those frequencies, and the dot products in that finite space approximate K(x, y) arbitrarily well. The infinite-dimensional geometry, compressed into a few hundred explicit coordinates with bounded error. The proof that this works is a theorem about the kernel; the fact that it works at all tells you how much of the infinite geometry was never being used.

## The Method, Named

Zoom out from the mathematics and the trick is a judgment about where the information is. The naive view of high-dimensional geometry is that the coordinates carry the object and the relationships are derived. The kernel trick asserts the opposite for a large and useful class of problems: the *relationships carry the object*, and the coordinates were scaffolding, overhead that could be discarded once the overlap table was computed.

That is why this post closes the arc that the Infinite Dimensions post opened. The substitutes climbed: analogy, shadows, slices, arithmetic standing in for sight. The kernel is the top of the ladder: geometry performed entirely as arithmetic, with the space it is *about* as unreachable in principle as a 1,536-dimensional embedding is in practice, and entirely harmless that it is. Every engineer who queries a vector database, reads a cosine, or trains an attention layer is downstream of the same 1909 theorem: Mercer's quiet identity, waiting sixty years for an application, and still paying out.
