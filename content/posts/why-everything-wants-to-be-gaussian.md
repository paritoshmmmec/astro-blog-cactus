---
external: false
title: "Why Everything Wants to Be Gaussian"
description: "Sum enough weakly-dependent terms and you get a Gaussian whose mass sits in a thin shell. From the CLT to loss landscapes to initialization schemes—the bell curve is not a modeling convenience. It is what high-dimensional space does."
date: 2026-09-07
tags: ["math", "embeddings"]
---

Ask a room of engineers why Gaussians are everywhere and you will get some version of: measurement noise, central limit theorem, bell curve, shrug. All true, none explanatory. The real answer is geometric, it is stranger than the folklore, and it is the direct sequel to the habits the Infinite Dimensions post cataloged.

Here is the strange version. In high dimensions, the Gaussian is what space *converges to*: the fixed point that sums of weakly-dependent quantities flow to, regardless of where they started. And a high-dimensional Gaussian is not shaped like a bell. It is shaped like a shell: nearly all of its mass sits in a thin spherical skin at radius √d, with a hollow interior it would be a mistake to picture. The bell curve you know is a one-dimensional shadow. The object itself is a bubble. This post is about why that bubble appears everywhere, and why your loss landscape, your initialization scheme, and your noise floor are all its footprints.

![The same Gaussian, seen two ways. Left: the familiar one-dimensional bell. Right: the radial distribution of probability mass for d = 1000: a thin shell at radius about the square root of d. The interior is empty.](/images/gaussian-bell-vs-bubble.png)


## The Convergence Nobody Orders

The central limit theorem, stated honestly: sum up a large number of independent (or merely weakly-dependent) contributions, none dominating the others, and the *fluctuations of the sum* converge to a Gaussian, no matter the shape of the ingredients. Uniform ingredients, exponential ingredients, lumpy and skewed and bimodal ones: sum enough of them and the histogram of the total closes its eyes and becomes the bell.

![The central limit theorem in action: sums of 1, 2, 4, and 12 uniform draws, standardized. Twelve is enough for the lumpy uniform to become the bell.](/images/gaussian-clt-sums.png)

Two features of this make it more than a statistics convenience.

First, the theorem does not care what the ingredients look like. Every distribution is an obedient raw material for the same fixed point. This is why the Gaussian appears in systems that have never heard of statistics: message latencies (many small delays summed along a path), sensor noise (many micro-disturbances summed at the diaphragm), measurement error (many independent mistakes summed by the instrument). Nobody chose the bell. The *adding* chose it.

Second, the theorem's high-dimensional upgrade is the one that matters for ML: *any* nice function of many weakly-dependent random inputs takes nearly the same value at nearly every point of the high-dimensional space (the concentration of measure phenomenon, which the Infinite Dimensions post met as "distance barely discriminates"). Deviations concentrate into exponentially thin sets. In the large, the space is stunningly uniform; the Gaussian bubble is what that uniformity looks like from the inside.

## The Bubble

Now the object itself, because the one-dimensional picture is actively misleading.

A Gaussian in d dimensions has density shaped like a bell in *every radial direction*—but the volume of space grows like radius to the d-th power, and that growth wins. Multiply the bell by the space it lives in and the product concentrates: the probability mass sits overwhelmingly near one radius, √d times the standard deviation, in a shell whose thickness is on the order of one unit regardless of d. For d = 1,000, the mass is in a skin at radius ~31.6 that is a few units thick. The interior (all that empty bell you picture) holds almost nothing.

Every surprising fact about high-dimensional Gaussians is this bubble wearing a different outfit. The norm of a Gaussian vector concentrates (it is the shell radius). Two independent Gaussian vectors are nearly perpendicular (two random points on a shell, in high d, are almost always a quarter-turn apart—the cosine concentration from the Infinite Dimensions post, now with a mechanism). The maximum of many Gaussian samples sits just above the shell radius, not far out in the tail (extreme values live on the bubble's rim, and the rim is crowded). And the distances from a fixed point to a cloud of Gaussian points cluster tightly: the nearest-neighbor ambiguity of vector search, for embeddings that are anywhere near Gaussian.

Why do embeddings end up Gaussian-ish at all? Because of what trained representations are made of: sums and pools of many learned contributions (attention outputs averaging over thousands of value vectors, activations summing thousands of weighted inputs). Everything that pools concentrates, per the CLT's high-dimensional upgrade. Real embeddings have structure on top of the Gaussian wash (that structure *is* the semantics), but the carrier they ride on, the bulk of the cloud, is the bubble. It is why the curse's distance-concentration shows up in real vector search, and why the manifold post is coming next: the interesting part of a high-dimensional cloud is the non-Gaussian part.

![Cosines between pairs of random unit vectors, at d = 2, 10, 100, 1000. At d = 2 the angle is genuinely all over the place; by d = 1000 everything is within a few hundredths of perpendicular.](/images/gaussian-cosine-concentration.png)


## The Footprints in Your Stack

Once the bubble is seen, its footprints are all over the training stack, and three are worth naming because each is usually explained by folklore instead.

### Initialization schemes are bubble-placement

Xavier and He initialization (the defaults in every framework) are theorems about keeping the shell radius stable layer over layer. Scale the initial weights wrong in a deep network and the forward signal either collapses to the origin (the bubble deflates) or explodes off the rim; the schemes are exactly the variance that keeps each layer's output on the same-radius shell. When the docstring says "appropriate for ReLU," it is quoting a radius calculation.

### Normalization is shell-fitting

Batch norm and layer norm recentre and rescale activations, pinning the mean to zero and the radius (via variance) to a constant. Under the geometric reading, they are mechanisms that re-inflate the bubble every layer, protecting the signal from the two ways it dies: shrinkage toward the hollow interior and escape past the rim. Their empirical indispensability is the bubble's strongest practical confirmation.

### Loss landscapes are Gaussian washes with structure on top

The noise floor of stochastic gradients is, by the CLT, approximately Gaussian in the parameters (mini-batch gradients are sums of many per-example gradients). The training dynamics everyone observes (noise that will not die, minima that flatten, the critical role of the noise scale relative to the learning rate) are the behavior of optimization on a landscape whose fog is the bubble. Even the "bell curve" of a single neuron's activation, across a batch, is the same object at d = 1, the shadow of the thing.

## The Fixed Point

Step back from the mechanisms and the unifying claim is simple. The Gaussian is the attractor: the shape that accumulations take, the shape that pooling makes, the default geometry of anything composed of many weakly-related parts. Deviations from it are information (structure, signal, the semantically interesting residue), and almost every interesting question about a high-dimensional system is a question about where and how it refuses to be Gaussian.

Which is the right note to hand off on. The next post follows the residue: the low-dimensional, stubbornly non-Gaussian structure inside embedding clouds that makes them useful at all.
