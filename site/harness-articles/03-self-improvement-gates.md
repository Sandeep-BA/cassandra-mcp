# A self-improving harness needs a promotion gate it cannot edit

Author: Sandeep Belgavi · Reviewed 18 October 2026

A failed agent run can teach you something useful: a missing tool description, an ambiguous task, a poor context selection rule or a retry policy that wastes attempts. Turning that lesson into an automatic change is tempting. But a system that proposes a new configuration and then declares itself improved has a conflict of roles. This article describes an original candidate-review loop in which proposal, evaluation and release authority remain separate.

<!-- diagram:Observed failure|Candidate configuration|Development evaluation|Locked held-out suite|Critical regression gate|Human release decision -->

## Define what may change

Start with a small configuration surface. A candidate might change a tool description, a context-selection rule or the number of allowed model turns within an existing ceiling. It should not expand its own permissions, disable audit records, rewrite the held-out labels or increase the production spending limit. Treat changes to those controls as separate security or operational work with explicit review.

Record a candidate identifier, parent version, changed fields and the failure examples motivating the change. The proposer may use development cases to iterate. Those cases are no longer independent evidence of general improvement once they have guided the proposal. This is true whether the proposer is a person, a language model or a simple search procedure.

## Keep evaluation sources separated

Randomly splitting near-duplicate examples can leak the answer pattern across partitions. Group related records by their originating incident, customer conversation or source document before assigning them to development and held-out sets. Store that membership independently of the candidate. If a group appears on both sides, reject the comparison until the split is repaired.

The promotion mission checks a deliberately small version of this rule. It compares `trainingGroups` with the groups in the supplied held-out cases. Any overlap produces `LEAKAGE_BLOCKED`. The browser makes these cases visible for learning; it is not a secure hidden benchmark. In a real workflow, the proposing agent should not receive held-out answers or detailed grader internals.

## Aggregate improvement is not enough

Suppose the baseline passes two of four examples and the candidate passes three. That is a better toy count, but what changed? A candidate that gains two easy cases while losing one critical authorization case must be blocked. Critical failures are vetoes in this exercise, even when the aggregate score rises. The severity rule is declared before evaluation rather than invented after inspecting a favored candidate.

Our fixture returns `CANDIDATE_READY_FOR_REVIEW` only when there is a measured count improvement, no overlapping source group and no failed critical case. It never returns “deployed.” The outcome is deliberately modest: supplied booleans on four teaching cases are not model measurements or statistical evidence. Real evaluation needs independently obtained results, representative cases, repeated trials where appropriate and uncertainty analysis.

## Improve the harness, not the scoreboard

[Anthropic's evaluation guidance](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) emphasizes maintaining regression coverage alongside capability evaluation. Apply that distinction to every candidate. Keep a protected set of previously successful behaviors, plus a separate set of difficult tasks that expose remaining weaknesses. Do not remove a failing regression merely because the revised agent has become better at a different task.

Inspect changes in cost, latency, refusal behavior and unnecessary tool use, not just task success. A harness that solves a task by exhausting a huge budget may be unsuitable for the product. A harness that refuses everything can look safe on one-sided tests while being useless. Include both permitted and forbidden cases so improvement cannot be achieved by one trivial behavior.

## Make release reversible

After independent review, record the exact approved configuration digest and evaluation version. Deploy to a bounded population, watch operational indicators and retain a known-good rollback. Approval for one configuration does not authorize later edits to that configuration. A self-improvement loop should stop when evidence is insufficient or a critical boundary fails; stopping is a useful outcome.

Run the supplied promotion fixture from the browser or offline CLI. First observe a candidate ready for review. Introduce a source-group overlap and watch it fail. Finally make a critical case fail while improving another case. The blocked result explains the central lesson: the proposing system can search for improvements, but it must not control the evidence or authority that promotes them.

[Try the promotion mission](/mcp/labs.html#promotion) · [Download our fixture](https://github.com/Sandeep-BA/cassandra-mcp/blob/main/examples/harness-promotion.json)
