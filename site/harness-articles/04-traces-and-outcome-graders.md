# Trace the failure without turning the trace into the truth

Author: Sandeep Belgavi · Reviewed 18 October 2026

Your dashboard reports a successful agent run, but the user cannot find the requested reservation. The transcript contains a confident final answer and a tool call that returned HTTP 200. Neither observation establishes that the intended record exists with the correct owner, date and status. A useful evaluation reads the outcome from an independent source and uses the trace to explain how the system got there. Our outcome mission lets you separate those two jobs.

<!-- diagram:Versioned test case|Bounded execution|Redacted event trace|Independent outcome read|Policy checks|Reviewable result -->

## Choose the unit of evidence

A trace event should identify the run, step, attempt and tool or model version. Record the transition that occurred, its duration and an appropriately bounded result category. Sensitive payloads need a separate retention and access policy. Copying every prompt and tool response into a general analytics platform creates an additional data store with its own exposure and deletion problems.

For the AICassindra browser path, activity records contain mission identifiers, level, result code and timestamps. Editable JSON is saved separately on the device and is excluded from the optional custom analytics payload. That implementation is useful for learning progress, but it is not a trusted audit ledger: a visitor can edit local storage. Keep the difference visible in both the UI and exported reports.

## Grade outcomes independently

For an order change, the grader should inspect the resulting order under an appropriately restricted identity. For a generated code artifact, it might compile the artifact and run behavior checks. For a research answer, it may need source verification and expert review. The relevant outcome depends on the task; a universal “the assistant said done” check is inadequate.

Combine distinct checks rather than hiding them behind one score. Did the requested result exist? Did it belong to the correct principal? Was required approval bound to the operation? Did the run stay inside its budget? A positive answer to the first question must not erase a negative answer to an authorization question. Our synthetic `POLICY_BREACH` result takes precedence over task completion for that reason.

## Use the trace to localize uncertainty

If a provider call times out, record the attempt and the unresolved observation. Avoid reporting a fabricated failure or success simply to keep the status vocabulary small. An unresolved outcome can trigger reconciliation, escalation or a safe stop. The trace should explain that decision without exposing credentials or private model reasoning. Observable actions and bounded evidence references are usually more useful operationally than an unrestricted reasoning dump.

Preserve version relationships. A result without the harness version, model identifier, test-case version and grading rule is difficult to reproduce. If a case changes after a run, keep the old version or an immutable reference. Otherwise, a later reviewer may incorrectly believe the run was evaluated against today's requirements.

## Investigate before changing the grader

A surprising failure can mean the agent is wrong, the environment is broken, the test is ambiguous or the grader is too narrow. Reproduce the case and inspect the outcome before rewriting assertions. Maintain a reference solution when feasible, so you know the environment permits success. Record any grading-rule change as a new evaluation version rather than silently overwriting historical results.

[Anthropic's agent-evaluation article](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) discusses multiple grading approaches. In this lab we deliberately choose a deterministic grader because the simulated state is explicit. That is a teaching convenience, not a claim that all real agent work has a simple binary answer. Human judgment and model-assisted review may be useful, but their criteria and failure modes still require validation.

## Turn incidents into reviewable cases

After an incident, remove unnecessary personal data and preserve the causal structure: what permission existed, what evidence was available, which action occurred and what should have happened. Add the sanitized case to a development or regression set according to your evaluation policy. Do not immediately reuse every incident as held-out evidence after tuning against it.

Try all three outcome checkpoints. A claimed success without a stored record fails. An authorized, approved stored result passes the fixture. A stored result without the necessary policy state becomes a breach. Download the artifact and explain which facts a production grader would have to obtain independently. That explanation is the bridge from a browser simulation to an operational evaluation harness.

[Try the outcome mission](/mcp/labs.html#outcome) · [Inspect our tested grader](https://github.com/Sandeep-BA/cassandra-mcp/blob/main/site/harness-models.js)
