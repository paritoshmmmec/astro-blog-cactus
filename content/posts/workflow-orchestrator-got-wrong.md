---
external: false
title: "What Workflow orchestrators got wrong?"
description: "What Workflow orchestrators got wrong?"
date: 2023-12-03
tags: ["design"]
---

## Introuduction

> Orchestrate Verb: to compose or arrange music for an orchestra

I have recently been playing around with a few notable workflow orchestrators, as listed below:

1. Airflow (https://airflow.apache.org/)
2. Mage AI (https://www.mage.ai/)
3. Dagster (https://dagster.io/)
4. Kestra (https://kestra.io/)

All these platforms are very good and solve real-world problems, e.g.,

1. Distribute workload across workers (Mage AI can take input and run on multiple workers).
2. Can run on a wide array of platforms, e.g., K8, AWS, and GCP
3. Support backfills and stream jobs (Airflow does not explicitly define backfill, but it is achievable).
4. Job scheduling and operation metrics
5. Dashboards

Each of these orchestrators provides array of other features which I have not listed above.

## So what they got wrong?

> Understanding of the problem is key.

However, despite having all these world class platforms, they have common theme.

### Deep integrations with codebases

Each of these platforms needs deep integration with codebases. Deep integration means they need to know about the source code and its intricate behavior.

Imagine if a music director or orchestrator needed to know all about their instrument players before directing them. That would be a disaster.

Dagster does it by creating a workspace, airflow needs dag decoration, and MageAI has the same problem. Kestra is the only platform that I have found that has the notion of `flow` which reduces this problem but still has too tight integration.

### Dashboard coupling with scheduler and codebases

Each of these orchestrators comes with a scheduler and web server (more or less). The web server is responsible for display statistics, logs, and server operational purposes. Dashboard is one of the selling points of these platforms, which is great. But it needs to run along with the scheduler, and in some cases, it needs to know the location of codebases.

Now you have to worry about two separate pieces of software at the same time.

### Lack of dynamic scaling based on runtime dataset

Let us suppose there is an upstream job A, and Job B is dependent upon it. Job A produces 1GB worth of data on each run, which gets processed by Job B. Job B may be able to process this data today, but with the scaling of data, Job B needs to change with time to scale this system.

Currently, all orchestrators do not provide scaling of the system based on the produced asset at runtime. Mage AI does it, but still, this information sits with the scheduler itself and not with the codebases where the pipeline is getting executed.

## Summary

I know there are more gaps in all orchestrators solutions which will surface with as we move ahead with time.
