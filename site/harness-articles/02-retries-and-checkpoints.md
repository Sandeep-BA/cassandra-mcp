# The retry that charged twice: durable checkpoints for agents

Author: Sandeep Belgavi · Reviewed 18 October 2026

An agent submits a refund request. The payment service commits it, but the response never reaches the caller. The agent sees a timeout and tries again. If the second attempt receives a fresh operation identity, two refunds may exist even though each individual request looked valid. The model did not need to be malicious. A normal recovery decision crossed an effect boundary without enough state. Our replay lab reduces this failure to a tiny ledger you can inspect after each attempt.

<!-- diagram:Logical operation|Stable request identity|Atomic effect and ledger|Ambiguous response|Retry same identity|Return recorded outcome -->

## Timeout is an observation, not an outcome

Separate what the caller observed from what the provider committed. A failure before the effect can permit a later attempt. A timeout after commitment requires reconciliation or replay against an idempotent operation. Treating both as an undifferentiated exception is a common way to turn an availability problem into duplicate business work.

In the exercise, `failure_before_commit` adds no record. `timeout_after_commit` records an effect while telling the caller that the outcome is unknown. `success` records an effect and returns normally. These named fixtures are intentionally clearer than real networks, where the timing may be unobservable. The production policy must be conservative precisely because the caller usually cannot know which side of the boundary failed.

## Stable identity needs payload binding

The lab's stable key represents one logical operation across attempts. When an earlier attempt committed, another request with that key returns the prior result without creating another effect. Turn stable keys off and each retry becomes a new operation. The effect counter reveals the duplicate even if the final response says success.

A real idempotency design also binds the key to a normalized payload, authenticated principal and operation type. Reusing a key for a different amount or destination should fail rather than returning an unrelated success. Define the retention window and conflict behavior. A key stored only in the worker's memory disappears on restart and cannot coordinate multiple workers. The storage and effect must follow a durable atomic contract supported by the system performing the effect.

## Checkpoint facts, not optimistic narratives

A checkpoint should distinguish planned, approved, submitted, committed, reconciled and delivered states. Recording “refund finished” before the provider outcome is known makes recovery unsafe. Recording only the final chat message loses the information needed to decide whether another tool call is allowed. Include an operation reference, the accepted payload digest and the last known outcome, while keeping sensitive values in the appropriate protected store.

On restart, the worker should first reconcile unresolved operations. It should not infer from an incomplete conversation that nothing happened. Conversely, a checkpoint claiming a completed action should be backed by a provider reference or durable local record. The application should reject a model-generated checkpoint that invents an effect identity.

## Recover with a deadline and a budget

Retries require their own capacity reservation. Set a maximum attempt count, total deadline and explicit conditions that permit retry. A provider timeout does not imply the request was free. Retry delay can reduce pressure during transient failures, but it cannot repair missing idempotency or establish authorization. Stop and surface an unresolved state when safe reconciliation is unavailable.

For longer work, reset the model's working context separately from restarting its effects. [Anthropic's long-running harness discussion](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) motivates explicit continuity between sessions. Our design adds a narrower business requirement: reconstructed context may refer to durable operation records, but it cannot replace them.

## Make the failure reproducible

Run the replay mission with a timeout-after-commit followed by success. With stable keys enabled, the effect counter stays at one. Disable them and observe two effects. Then replace both outcomes with failure-before-commit: the counter should stay at zero. Export all three cases and explain why identical user-facing retry language can hide very different stored outcomes.

The simulator uses a sequential in-memory set. It demonstrates the decision rule, not a distributed transaction implementation. Before adopting the pattern, test concurrent requests, process crashes around commit, key collisions, changed payloads, expired records and provider-specific replay behavior. A real recovery test should kill or interrupt the worker at known boundaries and verify the durable outcome independently.

[Try the replay mission](/mcp/labs.html#replay) · [Inspect our model implementation](https://github.com/Sandeep-BA/cassandra-mcp/blob/main/site/harness-models.js)
