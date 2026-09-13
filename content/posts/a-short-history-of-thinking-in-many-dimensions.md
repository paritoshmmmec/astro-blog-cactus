---
external: false
title: "A Short History of Thinking in Many Dimensions"
description: "From Riemann's 1854 lecture to Hilbert's function spaces: the story of how mathematicians learned to work where they cannot see, a century before embeddings made it a production concern."
date: 2026-08-08
tags: ["math", "history"]
---

Every engineer working with embeddings is, whether they know it or not, the beneficiary of a cultural revolution that happened in mathematics between 1844 and 1932. Before that century, geometry was the study of the space we live in: three dimensions, maybe four if you were speculative. After it, geometry was the study of *any* structure that behaved like space, in any number of dimensions, including infinitely many. The pictures did not survive the transition. Mathematics did, and learned to work where it could not see.

This is the origin story the Infinite Dimensions post promised: not only the techniques (shadows, slices, arithmetic)but the people and the resistance, because the techniques were not adopted easily. They had to be fought for, by mathematicians against their own training, and the argument that finally won is one that engineers will recognize instantly.

## Riemann Breaks the Pictures (1854)

The story's pivot is a lecture given to mark a promotion. Bernhard Riemann, twenty-seven years old and chronically underemployed, was required to submit a habilitation thesis, and Gauss (the greatest living mathematician, and the examiner) chose the topic from a list Riemann offered: *On the Hypotheses which lie at the Foundations of Geometry*.

The lecture Riemann delivered in Göttingen that June is famously difficult, and the difficulty is the point. Riemann proposed that geometry begin not with pictures or axioms about physical space, but with an abstract object: a *manifold* of points, carrying only a notion of infinitesimal distance between nearby ones. All geometry, he argued, should be derived from that object by calculation. No dimension is privileged. The space might be two-dimensional, might be three, might be curved, might have no shape your senses could host. Whether physical space itself is such a manifold was, Riemann noted carefully, an empirical question for physics, and one his framework was built to *survive answering either way*.

The audience, Legendre's heirs and Gauss's colleagues, mostly did not know what to make of it. The historian sees why it landed so strangely: Riemann was proposing to *unhook geometry from sight*, permanently, and to replace seeing with computation. That is precisely the mental move every engineer makes when they stop trying to visualize a 1,536-dimensional embedding space and start trusting the distance function. Riemann got there first, on faith in arithmetic alone, a hundred and seventy years early.

## Hamilton, Grassmann, and the Wrong Victories

The reaction to Riemann ran through two men whose stories make the sociology of the revolution legible, because one won the wrong prize and the other won the right one posthumously.

William Rowan Hamilton spent the 1830s and 40s hunting an algebra of three-dimensional space, and stalled, famously, because the algebra refused to exist. His 1843 breakthrough, quaternions, came in a flash of insight he carved into a Dublin bridge: to make rotation algebra work, he needed *four* dimensions and a sacrifice, namely multiplication that does not commute. Quaternions are a beautiful system and, for a generation, a seductive dead end: Hamilton spent his remaining decades insisting that physics should be rewritten around them, and the quaternionists' insistence that you must think in four dimensions *the old way, with pictures*, alienated the very people they were trying to convert. The algebra survived (rotation math in every game engine today is quaternion math), but the method that won was not Hamilton's.

Hermann Grassmann had the better method and a worse career. An obscure Prussian schoolteacher, he published in 1844 a general algebra of n-dimensional spaces (any n) with the ideas modern linear algebra still runs on: basis, dimension, projection, inner product as a *calculated* quantity, geometry as pure structure. The mathematical establishment ignored it almost completely; Grassmann, a schoolteacher with no institutional allies, watched the work he most believed in die of loneliness and turned to Sanskrit philology, where he is still cited. The mathematics that eventually conquered physics and computing is recognizably Grassmann's, rediscovered by people who had read him too late or not at all.

The lesson engineers will recognize: the winning idea was the one that *generalized without pictures*, and it lost the first decades of its life to a better-marketed idea that promised to keep them.

## Hilbert Makes Infinity a Place

The last act belongs to David Hilbert, who did for infinite dimensions what Riemann had done for finite ones.

Through the 1900s, mathematicians had accumulated concrete infinite-dimensional objects (Fourier's functions-as-waves, controversial in 1807; the eigenfunction expansions of physics) without agreeing on what kind of space they lived in. Hilbert's move, around 1906 in collaboration with Erhard Schmidt, was to notice that the *algebra* was already done: if you treat functions as points whose distances and angles are computed by an integral (the continuous cousin of the dot product), then the entire apparatus of n-dimensional geometry transfers, and the "space" of square-integrable functions becomes a coherent geometric object, infinite-dimensional, in which convergence, distance, and perpendicularity are theorems rather than hopes. von Neumann gave the abstraction its modern axioms and its name, Hilbert space, in the 1920s. Quantum mechanics adopted it as its native habitat almost immediately, because superposed states *are* vectors and measurement *is* projection.

The significance for this blog's running argument is the final unhooking. Riemann removed the requirement that geometry be about visible space. Hilbert removed the requirement that it be about *any* particular space: the points could be functions, signals, states, and eventually, though no one in Göttingen could have guessed it, sentences. When an embedding model maps text into a space where distance means relatedness, it is doing to language what Hilbert did to functions: finding a geometry in an object that no one expected to have one, by defining the inner product and letting the theorems follow. The kernel-trick post will push this exact move to its limit.

By 1932, when Banach's textbook consolidated the general theory, the revolution was administratively complete: dimension was no longer a fact about the world but a parameter of a structure, and "space" meant any object obeying the axioms. A century of resistance had produced, as its byproduct, the exact skill that modern ML runs on: arithmetic standing in for sight, checked where sight worked, trusted where it could not.

The Square in Flatland needed a Sphere to lift him before he believed. The mathematicians lifted themselves. It took them eighty-eight years, two ignored geniuses, and one bridge carved in a fit of insight, and every vector database on earth is running on their winnings.
