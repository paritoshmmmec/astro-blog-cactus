---
external: false
draft: false
featured: false
title: "Understanding One-Step FB: Reinforcement Learning Through Representations"
description: A practical introduction to One-Step Forward–Backward methods and how they turn long-horizon reinforcement learning into representation learning.
date: 2026-02-14
---

## Introduction

Reinforcement Learning (RL) often feels complicated because it mixes neural networks, value functions, planning, and long-term reasoning. When people first read about **One-Step Forward–Backward (FB)** methods, the idea sounds strange:

> How can an agent make one-step decisions and still solve long-term problems?

This post explains the idea simply — especially if you already understand basic deep learning.

---

## The Usual Way RL Works

Traditional RL tries to answer a hard question:

> What is the long-term reward if I take this action now?

Algorithms like DQN or actor–critic methods learn a **value function**:

```txt
Q(s, a) = expected future reward
```

This requires recursive updates (Bellman equations), which can be:

- unstable
- hard to train
- slow for long horizons

So RL often feels heavier than normal deep learning.

---

## The Key Idea of One-Step FB

One-Step FB changes the perspective.

Instead of learning rewards directly, it learns **representations** that describe:

- where actions tend to lead (Forward)
- what goals look like (Backward)

Then action selection becomes simple:

```txt
choose action with highest alignment:
F(s, a) · B(g)
```

Where:

- `F(s, a)` = forward embedding
- `B(g)` = goal embedding
- dot product = how reachable the goal is via that action

---

## What “Representations” Actually Mean

A representation is just a learned vector.

In FB:

### Forward representation

Represents:

> the future possibilities created by taking an action.

It is not a prediction of the next state — it summarizes many possible futures.

---

### Backward representation

Represents:

> what kinds of trajectories end at a goal.

Think of it as the “signature” of reaching that goal.

---

## Training Intuition

Training uses real transitions from trajectories:

```txt
(state, action) → later state (goal)
```

The model learns:

- bring F(s,a) closer to goals that truly happen later
- push away unrelated goals

Over time:

```txt
dot product ≈ reachability
```

The network learns a geometry where closeness means:

> easy to reach.

---

## Why One-Step Decisions Still Work

At first this seems impossible.

How can greedy one-step choices solve long tasks?

The answer:

The representations already contain long-term information.

The agent isn't choosing a short-term action — it's choosing the action whose **future direction** points most toward the goal.

In other words:

- long-term reasoning happens during learning
- decisions become simple at execution time

---

## Deep Learning vs FB

FB uses normal deep learning machinery:

- neural networks
- embeddings
- gradient descent

So why does it feel different?

Because it does not learn outputs.

### Normal deep learning

```txt
input → prediction
```

### One-Step FB

```txt
state + action → future embedding
goal → goal embedding
```

Behavior emerges from comparing vectors.

---

## How FB Differs from Traditional RL

Traditional RL:

```txt
Representation
      ↓
Value Function (critic)
      ↓
Policy
```

One-Step FB:

```txt
Representation
      ↓
Direct action scoring
```

The representation itself plays the role of the value function.

---

## A Simple Mental Model

Imagine a map where:

- distance means "number of steps to reach"
- actions point in directions across this map

The agent simply follows the direction pointing toward the goal.

FB learns this map automatically.

---

## Is FB a Separate Module?

Not really.

The FB model **is** the RL agent.

During training:

1. Agent acts using current embeddings
2. Environment produces new data
3. Representations update
4. Policy improves automatically

No extra RL layer is attached afterward.

---

## Why Researchers Like This Direction

Modern RL is shifting toward:

> representation first, planning second.

Reasons:

- more stable training
- easier reuse across goals
- stronger generalization
- simpler decision-time computation

FB fits this trend perfectly.

---

## One-Sentence Summary

One-Step FB turns reinforcement learning into representation learning by teaching a network to encode reachability, then choosing actions whose learned future aligns with the goal.

---

## Final Thought

If classic RL tries to **calculate** long-term value every step, FB tries to **learn a space** where long-term value becomes simple geometry.

That shift — from recursion to representation — is why FB feels both familiar (deep learning) and new (RL).
