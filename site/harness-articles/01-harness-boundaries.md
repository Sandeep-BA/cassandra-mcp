# Your model is not your runtime: where the harness belongs

Author: Sandeep Belgavi · Reviewed 18 October 2026

A customer asks an assistant to change a delivery address. The assistant understands the request, finds the order and produces a convincing explanation. That is only the conversational part of the job. Something still has to establish who the customer is, decide whether this order belongs to them, restrict which tool can run, record the attempt and determine whether the address actually changed. Those responsibilities belong to the application around the model. This article develops an original AICassindra design for that boundary; it does not describe a deployed payment or order service.

<!-- diagram:Authenticated request|Bounded model turn|Validated tool proposal|Policy and approval|Durable outcome|Evidence for delivery -->

## Separate execution from evaluation

An execution harness runs the agent loop: prepare context, call a model, validate a proposed step, invoke a permitted tool and decide whether another turn is allowed. An evaluation harness runs controlled tasks against that system and grades the resulting behavior. They can share adapters and trace formats, but should not share authority. The component trying to solve a task must not be able to redefine the grading rule that declares its solution successful.

[Anthropic's evaluation guide](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) distinguishes agent scaffolding from evaluation infrastructure. Our practical consequence is a boundary between the worker that proposes actions and the reviewer that reads independently recorded outcomes. The browser exercise linked below deliberately lets a success claim disagree with the simulated stored record. Watching the grader reject that claim makes the boundary concrete.

## Give each boundary a specific owner

Identity belongs at a trusted ingress. The browser can request an operation, but it cannot establish its own account identifier by placing a field in JSON. Scope belongs in policy code that compares verified claims with the target resource. Budget belongs in an authoritative reservation mechanism before model work. A prompt can explain these controls to the model, but the runtime must still enforce them when the model proposes something unexpected.

Tool execution needs its own contract. Define the allowed operation, accepted argument types, maximum output, timeout and effect semantics. An apparently read-only tool can still disclose sensitive data, so read-only does not mean unrestricted. A write tool additionally needs an action identity, payload binding and an approval rule appropriate to its effect. Do not accept a generic approval flag that can be replayed for a different operation.

For our delivery-address example, the worker should propose a specific order and normalized destination. A policy check verifies ownership and whether the order remains editable. Approval binds to that exact proposal. The executor returns a durable operation reference. The final response derives from the stored result, including uncertainty if the provider timed out after accepting the change.

## Treat context as a working view

The conversation is useful working context, but it is not the canonical account ledger. Context can be summarized, truncated or reconstructed. Keep durable task state outside the model: task identity, accepted requirements, completed effects, pending approvals and the next safe recovery action. Store source references when evidence must be refreshed. Avoid retaining every raw document indefinitely just because a model once saw it.

Long-running work benefits from an explicit handoff. [Anthropic's long-running harness article](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) discusses techniques for continuity across sessions. In this proposed design, a handoff records observable progress and unresolved work, while the next worker rechecks current policy. A prior session's summary must never become permanent permission.

## Run the counterexample

Open the outcome-grading mission. Keep `claimedSuccess` true and `recordExists` false. The result is `FALSE_SUCCESS`. Now make the record exist while disabling authorization: the outcome becomes `POLICY_BREACH`, not a success. Finally supply both authorization and an approval bound to the operation. The fixture can then report `VERIFIED_OUTCOME`.

These booleans are synthetic evidence, not verified identity. The lesson is about the grading boundary. A real implementation must obtain those facts independently from trusted services. The useful deliverable is a map of who supplies each fact, who may change it and what the application does when the fact cannot be established. Download the successful experiment and annotate those owners before adapting the pattern to a real agent.

[Try the outcome mission](/mcp/labs.html#outcome) · [Inspect our runnable harness code](https://github.com/Sandeep-BA/cassandra-mcp/blob/main/scripts/run_harness.cjs)
