---
external: false
title: "Prompt Caches Only Hit When Prefixes Match"
description: "Prompt caches give a 90% discount on input tokens, but only when request prefixes match. Why KV-cache reuse is positional, and what that means for API design."
date: 2026-05-12
tags: ["llm", "caching"]
---

Every major model provider sells the same input token at two prices. Pay full price, or claim roughly a 90% discount by proving you have already computed this exact prefix before. The discount mechanism has different names -- Anthropic calls it prompt caching, OpenAI folds it into automatic caching, Google sells context caching -- but underneath, they are all selling the same thing: reuse of the KV cache that the model already computed for your earlier tokens.

The catch is in the fine print, and the fine print says one thing over and over: the cache matches on prefix. Not on similarity. Not on meaning. On an exact, positional, token-for-token match from the first token of the request.

If you have spent years designing around HTTP caching, this sounds familiar and then, halfway through, it does not. Getting where it stops sounding familiar is the whole game, because that line is where API design for LLMs has to depart from everything the last twenty years taught us.
## Why It Is Positional

Start with what the cache actually stores. A transformer does not read a prompt the way a program reads a file. As it ingests your tokens, it writes intermediate state -- the key and value tensors for every token, at every layer, for every attention head. That state is the KV cache, and computing it is the expensive part of serving your request. Generating the next token is cheap *if* the KV cache already exists.

A prompt cache, then, is a KV cache kept warm between requests. The question is when a stored cache can serve a new request, and the answer comes from how attention works. The attention computation for token 5,000 looks at tokens 1 through 4,999. Its key and value tensors are therefore functions of everything before it. Change one token near the start of the request and every downstream tensor is different, not just at that position but all the way to the end.

So reuse is only sound when the new request shares the old request's opening, exactly, and in the same positions. Hence the prefix rule. It is not a product decision someone made. It falls straight out of the arithmetic.

This is also why the fine print keeps repeating itself. Anthropic's docs say the cache is broken by any change to the prefix -- adding, removing, or altering even a single token. OpenAI says caching works on exact prefix matches, with the first 1,024 tokens as the minimum. Providers put system prompts and tools first in the recommended request layout for the same reason: whatever you put first is the part every request can share.

## Where It Diverges from HTTP Caching

If you know HTTP caching, half of this maps cleanly. Vary headers are prefix matching in disguise. A `Vary: Accept-Encoding` header says: this response is only valid for requests whose encoding header matches. CDNs have always favored prefix invalidation, because resource hierarchies tend to share prefixes. Surrogate keys let a CDN purge everything tagged `products` -- a coarse prefix over URLs.

The differences are what matter. Three of them, each with design consequences.

First, the key is invisible. HTTP cache keys are built from things you can see: URL, method, headers. The prompt cache key is the token sequence itself, and it depends on the tokenizer, which is internal. Two requests that print identically can tokenize differently if you reordered JSON fields. There is no cache-debugging header. Your first symptom that the cache missed is the bill.

Second, there is no way to test a key before you pay for it. The closest thing is Anthropic's usage counters in the response: how many input tokens were cache-read, how many were cache-written, at their respective rates. That is a receipt, not a probe. You cannot ask "would this request hit?" without paying to send it. Cache validation, a solved problem in HTTP for twenty-five years, does not exist here.

Third, writing costs money. In HTTP, filling a cache is free; only reads save you money. Prompt caches flip it: cache writes cost *more* than uncached input -- Anthropic charges 1.25x for the write, then 0.1x for subsequent reads. Your first request with a new prefix pays a premium, and the discount only materializes if a later request actually reuses that prefix within the TTL, measured in minutes. It is a bet, priced as one.

## The Design Consequences

Once you accept that the cache key is a token prefix and the pricing is write-premium-read-cheap, a surprising number of API design rules fall out. These are the ones worth internalizing.

### Keep the stable stuff first

System prompt, tool definitions, the retrieval corpus -- whatever is the same across requests belongs at the front of the request, and it must not vary by even a byte between requests. Sort your JSON keys. Stop formatting timestamps into the system prompt. That innocuous "Generated at 2026-09-13T14:22:01Z" at the top of the prompt is a cache invalidation firing every second, and you are paying full freight plus the write premium for it.

### Put the volatile stuff last

The prefix rule has a mirror image: what changes between requests should sit at the end, because changing the tail invalidates nothing. User messages, per-request context, that timestamp -- tail is where it lives. The order system-prompt, tools, retrieved documents, conversation history, user message is not stylistic. Every provider recommends it because it is the shape that maximizes the shared prefix.

### Treat request shape as a contract

In REST, the URL is the contract and the body is free-form. In LLM APIs, the serialized token stream is the contract, including whitespace and field order. Anything that nondeterministically reshapes the request -- an unsorted map, a language model rewording your agent's own tool calls, a middleware that injects a trace ID into the prompt -- is silently draining your cache. The teams that save the most on inference treat their prompt templates with the care that platform teams reserve for API versioning.

### Know your loops from your one-shots

Because writes cost more, a cache is only profitable above some reuse threshold. One-shot requests should not pay it. Long-lived conversations, agent loops that re-send growing context every turn, batch jobs that share a document across thousands of questions -- those are where caching is free money. The API design consequence: know which of your traffic is a loop and which is a one-shot, and let them share a prefix only when they genuinely share content.

### Watch the eviction cliff

Caches are finite and the TTL is minutes. Eviction is invisible -- the only signal is that your next request was a write at 1.25x instead of a read at 0.1x. If your traffic is bursty with gaps longer than the TTL, you are paying the write premium over and over for the same prefix, and no dashboard will tell you unless you built one from the usage counters.

## The Agent-Loop Case

The agent workload deserves its own paragraph, because it is the perfect customer for prefix caching and the easiest one to break.

An agent loop re-sends its entire history on every turn. Turn 20 of a long session re-sends turns 1 through 19, byte-identical, plus one new message. With a warm cache, that repeated history is billed at 0.1x. Without one -- say the agent framework reorders its message array, or a compaction scheme rewrites a middle turn -- the entire history re-bills at full price, every turn.

This is why the growing-prefix append pattern is the single most valuable thing an agent loop can do for its own economics: never rewrite anything before the tip of the context, only append. It is also worth noting the tension with compaction, one of the backpressure patterns: compaction that summarizes early turns saves tokens but invalidates the cache they occupied -- sometimes the cheapest move is to keep paying 0.1x rent on history you would rather evict, because eviction costs a full-price re-read. When the window is tight the eviction is mandatory; when it is not, the cache rent is often the better deal. That trade deserves a number attached, and the usage counters give you the inputs to compute it.

## What Would Make These APIs Better

The providers have shipped the hard part -- the KV reuse -- and left the ergonomics twenty years behind HTTP. What the gap looks like, concretely:

- A dry-run endpoint: would this request hit, and where would the prefix diverge? HTTP got `If-None-Match` in 1999. This is the same hole.
- A divergence signal: "your request shared 4,096 tokens, then diverged at token 4,097," instead of forcing teams to reconstruct this from bills.
- Explicit control over what belongs in the cacheable prefix, rather than inferring it from array order -- Google's context caching takes a step here by letting you declare cacheable content, and its quirks (stored prompts have their own pricing and TTL) show how far there is to go.

Until then, the discipline lives in application code. Order your payloads by volatility. Hash your template prefixes and alert when the hash of a supposedly-stable prompt changes. Turn the usage counters into a cache hit-rate metric, per endpoint, and watch it like you watch p99 latency. None of this is glamorous. All of it is the difference between 0.1x and 1x on the largest line of your inference bill.

The providers solved the arithmetic. The API design is up to you.
