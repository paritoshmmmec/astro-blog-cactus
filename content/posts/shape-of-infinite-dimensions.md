---
external: false
title: "The Shape of Infinite Dimensions"
description: "Nobody can picture four dimensions, let alone 1,536. Here is what mathematicians use instead of seeing—shadows, slices, unfolding, and arithmetic that functions as sight—and where your embedding model already lives by the same tricks."
date: 2026-09-01
tags: ["math", "embeddings"]
---

Ask a mathematician what a four-dimensional cube looks like. You are expecting either a confession or a bluff. You get neither. You get a description of its shadow.

That is the first thing to understand about high-dimensional geometry: nobody sees it. Not the geometers, not the physicists, not the people who trained your embedding model. Four dimensions defeats human vision the way a frequency above 20 kHz defeats human hearing—not because you lack talent, but because the apparatus does not come with that range. What working mathematicians have instead is a set of disciplined substitutes for seeing. Analogy, shadows, unfolding, slicing, and eventually arithmetic that behaves like sight.

These substitutes are learnable, which is fortunate, because they stopped being optional curiosities. Every time you query a vector database you are asking a question about a space with more dimensions than atoms you will think about today. The people who built that space could not picture it either. They used the same substitutes, and your retrieval quality is downstream of how well they used them.

## The Training Method from 1884

In 1884, Edwin Abbott published a novella about a Square who lives in a two-dimensional world, is visited by a Sphere, and cannot believe the visitor is real. The Sphere, to prove itself, does the only thing it can: it lifts the Square. The Square's body is lifted out of its plane of existence, and it watches its own world from outside—sees inside its neighbors' houses, sees the whole plane at once.

Flatland reads as social satire. But embedders should read it as a training method, because the trick the Sphere performs is exactly the trick dimensional analogy performs. The move is always: go down one dimension, where you *can* see, do the operation there, and carry the pattern up.

Watch it once, properly. A square is two perpendicular line segments from a corner. A cube is three perpendicular segments from a corner. Each new dimension adds one more perpendicular direction, and every old object gains a copy of itself displaced along it. A line dragged sideways sweeps a square. A square dragged upward sweeps a cube. A cube dragged in a fourth perpendicular direction—no direction your eye knows, but the arithmetic permits it—sweeps a tesseract.

Now the actual math, which is where the vague "fourth perpendicular direction" stops being mysterious. A d-cube has 2^d vertices and its k-dimensional features (edges, faces, cells) follow a simple count: there are 2^(d-k) times C(d,k) of them. For the cube in your room that gives 8 vertices, 12 edges, 6 faces—check it, it works. For the tesseract, d=4: 16 vertices, 32 edges, 24 square faces, 8 cubical cells.

Nothing about that required a picture. That is the point, and it is the first half of the substitutes: the analogy tells you what to expect, and the combinatorics tells you it is real. The tesseract is not a spooky object. It is a cube the way a cube is a square, and you know its anatomy down to the number of its corners.

## Shadows, Unfoldings, and a Painting

A wireframe cube held in sunlight casts a shadow on the floor. Hold it corner-on—one vertex toward the sun—and the shadow is a hexagon with lines through its middle. Two dimensions of shadow for a three-dimensional thing; information has been lost, but structure survives.

Light a tesseract the same way and its shadow in our three-dimensional space is a cube nested inside a cube. The eight corners of the inner cube are the eight corners of the outer cube, displaced along a direction that does not exist in our room. Better: rotate the tesseract and the shadow does something no physical object does—the inner cube swells, merges with the outer, and turns itself inside out.

Salvador Dalí painted the most famous version of this. *Corpus Hypercubus* (1954) shows Christ crucified not on a cross but on an unfolded tesseract—a cross-shaped arrangement of eight cubes, floating above a chessboard floor. The choice was exact, not merely striking: an unfolded tesseract *is* cross-shaped, and the painting is an accurate technical drawing, in our space, of an object that is not in it.

The operation Dalí used is the second substitute: unfolding. A paper cube cut along seven of its twelve edges and flattened leaves six squares—the surface of the cube, laid out in a lower dimension. Do the same to a tesseract—cut eight of its cells apart and flatten—and you get eight cubes arranged in space, and it turns out there are exactly 261 distinct ways to do the cutting. Eight squares bound a cube the way six squares bound... no, wait: six squares bound a cube, and eight cubes bound a tesseract. The pattern is the same one as before: every object in dimension d has a surface made of objects from dimension d-1, and flattening that surface into your space is something your eye can actually inspect.

## Let the Object Come to You

Shadows and unfoldings both require you to imagine hovering outside a space you cannot enter. Slicing is the opposite trick: stay put in your own dimension and let the higher-dimensional object pass through it.

In Flatland terms: instead of the Sphere lifting the Square, the Sphere descends. What does the Square see? A point appears out of nothing, swells into a circle, widens to a maximum, then shrinks and vanishes. The visitor was a three-dimensional being the whole time; the Square only ever saw its cross-sections, one plane at a time.

Run the same film one dimension up. A four-dimensional sphere passing through our space looks like—exactly like—a point of light swelling into a sphere, widening, and closing away to nothing. And here is the surprise that keeps slicing from being a party trick: that is one of the rare cases where the fourth dimension behaves *better* than the third. Spheres are the same animal at every dimension—round, calm, self-similar. It is their container, the cube, that turns monstrous, for reasons the arithmetic will make brutal in a moment.

Slicing is also the substitute your own tooling uses. A PCA plot, a t-SNE plot, a UMAP plot of your embedding space is a projection—a shadow, flattened from 1,536 dimensions into two. Everything wrong with those plots (clusters that look separate but overlap, distances that lie, structure that appears only in a different random seed) is the hexagon-shadow problem: real structure lost a dimension on the way down. Reading those plots well *is* slicing intuition, applied.

## Where Sight Runs Out, Compute

Sooner or later the analogies run out. Dragging cubes and nested shadows will not tell you what a random point cloud looks like in a thousand dimensions, and your corpus lives in something much more like a random point cloud than like a rotating tesseract. This is the last substitute, and the honest one: arithmetic that acquires, through repetition, the *feel* of a picture.

The classic: inscribe a sphere in a cube, and ask what fraction of the cube the sphere fills. The exact answer is pi^(d/2) divided by 2^d times Gamma(d/2 + 1)—no derivation needed, just a formula you can poke. And poke it you should, because checking it against your eye is what makes it trustworthy. At d=1 it gives 1: the segment fills itself. At d=2 it gives pi/4, about 0.785: a circle in a square, and you can see that it is right. At d=3, pi/6, about 0.524: a ball in a box, sure. Your visual instinct, calibrated on 1, 2, and 3, will now promise you a slow, gentle decline.

The promise is a lie. The fraction collapses: about one percent by dimension 20, and around 10^-70 by dimension 100. In high dimensions almost all the volume of a cube lives near its corners—the sphere in the middle is effectively absent. Your eye was trained in a regime that stops existing. The formula did not do anything exotic. It just kept being right past the point where you could look.

One more, because it is the arithmetic your vector database runs every day. The cosine of the angle between two random unit vectors in d dimensions concentrates around zero in a band of width roughly one over root d. At d=1,536, one over root d is about 0.026, so two random vectors are almost exactly perpendicular—cosines within a few hundredths of zero, with high probability. This single fact is why thousands of concepts can each get their own direction in embedding space without crowding each other—the room exists, and the arithmetic says so. It is also, pointed the other way, why distances concentrate into a narrow band and nearest-neighbor search gets strange: the same concentration that makes concepts separable makes "closest" barely differ from "anywhere near".

Spend enough hours with numbers like these and something shifts. You stop translating every fact back down to three dimensions and checking whether it feels right; the numbers begin to feel right directly. Ask a geometer what they mean by intuition in high dimensions and, pressed, this is what they will describe. Not a picture. A stock of verified arithmetic, checked against the eye where the eye worked, trusted past where it stopped.

## The Shadows You Already Ship

Put the substitutes back to back and a pattern shows: every one of them trades a dimension you cannot visit for a representation you can inspect. Analogy trades d for d-1 by construction. Shadows trade d for 2 or 3. Unfoldings spread a d-dimensional surface into your room. Slices hand you one low-dimensional sheet at a time. Arithmetic trades geometry for algebra—a currency your eye eventually learns to spend.

That trade is not a mathematician's workaround. It is load-bearing in production systems. Your embedding model was trained in a space no human has seen; the loss function that shaped it was verified the way the sphere formula was—against cases where we could look, then trusted beyond. Your vector index navigates the space by arithmetic alone, never once needing the picture. The t-SNE plot in your observability dashboard is Flatland's shadow of the Sphere, exactly as alarming and exactly as useful.

The Square in Flatland eventually believed the Sphere, but only after being lifted out of his plane—a privilege nobody gets in a 1,536-dimensional space, his author included. What we get instead is the substitutes. They are enough to reason with, which is most of what seeing was ever for.
