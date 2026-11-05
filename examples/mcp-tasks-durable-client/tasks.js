// Author: Sandeep Belgavi. Long-running MCP tool calls with the Tasks extension (io.modelcontextprotocol/tasks):
// an in-memory receiver that returns task handles, and a requester that persists the task id in a run journal,
// polls with pollIntervalMs, answers input_required, resumes after a restart and treats an expired task as unknown.
// Shapes follow the ext-tasks v2 schema (Task, CreateTaskResult with resultType "task", tasks/get, tasks/update,
// tasks/cancel). Original example for the aicassindra.com guide "Long-Running MCP Tool Calls With the Tasks
// Extension". Standard library only; simulated time; no MCP SDK, network or model is used.

export const EXTENSION = 'io.modelcontextprotocol/tasks';
export const TERMINAL = new Set(['completed', 'failed', 'cancelled']);

export class SimClock {
  constructor() { this.now = 0; this.sleeps = []; }
  sleep(ms) { this.sleeps.push(ms); this.now += ms; }
  iso() { return new Date(Date.UTC(2026, 10, 5, 4, 0, 0) + this.now).toISOString(); }
}

// Receiver: a re-pricing tool that takes `steps` units of work, asks for confirmation after `confirmAt` units,
// and honours cancellation between units (cooperative). Tasks are visible only to their owner.
export class Receiver {
  constructor(clock, { ttlMs = 600000, pollIntervalMs = 2000, steps = 5, confirmAt = 2 } = {}) {
    Object.assign(this, { clock, ttlMs, pollIntervalMs, steps, confirmAt });
    this.tasks = new Map(); this.seq = 0; this.runs = 0;
  }
  callTool(owner, name, args, meta = {}) {
    const caps = meta['io.modelcontextprotocol/clientCapabilities'] || {};
    const optedIn = Boolean(caps.extensions && EXTENSION in caps.extensions);
    this.runs += 1;
    if (!optedIn) {                       // never return a task to a client that did not declare support
      this.#finishWork(name, args);
      return { content: [{ type: 'text', text: 'repriced synchronously' }], structuredContent: { repriced: args.titles } };
    }
    const taskId = 'task-' + String(++this.seq).padStart(4, '0');
    const t = { taskId, owner, status: 'working', createdAt: this.clock.iso(), lastUpdatedAt: this.clock.iso(),
      ttlMs: this.ttlMs, pollIntervalMs: this.pollIntervalMs, done: 0, args, cancelRequested: false, created: this.clock.now };
    this.tasks.set(taskId, t);           // stored durably before the response is sent
    return { resultType: 'task', ...this.#view(t) };
  }
  #finishWork() { /* synchronous path: the work happens inside the call */ }
  #view(t) {
    const v = { taskId: t.taskId, status: t.status, createdAt: t.createdAt, lastUpdatedAt: t.lastUpdatedAt, ttlMs: t.ttlMs, pollIntervalMs: t.pollIntervalMs };
    if (t.statusMessage) v.statusMessage = t.statusMessage;
    if (t.status === 'input_required') v.inputRequests = { confirm: { method: 'elicitation/create', params: { message: 'Apply the new prices to the backlist?' } } };
    if (t.status === 'completed') v.result = { structuredContent: { repriced: t.args.titles }, content: [{ type: 'text', text: `repriced ${t.args.titles} titles` }] };
    if (t.status === 'failed') v.error = { code: -32603, message: t.error };
    return v;
  }
  #lookup(owner, taskId) {
    const t = this.tasks.get(taskId);
    if (!t || t.owner !== owner) return null;          // another user's id looks the same as a missing one
    if (t.ttlMs !== null && this.clock.now - t.created > t.ttlMs) { this.tasks.delete(taskId); return null; }
    return t;
  }
  advance(units = 1) {                                 // the worker makes progress between polls
    for (const t of this.tasks.values()) {
      for (let i = 0; i < units && !TERMINAL.has(t.status) && t.status !== 'input_required'; i++) {
        if (t.cancelRequested) { t.status = 'cancelled'; t.statusMessage = `cancelled after ${t.done} of ${this.steps} units`; break; }
        t.done += 1;
        if (t.done === this.confirmAt && !t.confirmed) { t.status = 'input_required'; t.statusMessage = 'waiting for confirmation'; }
        else if (t.done >= this.steps) { t.status = 'completed'; }
        else t.statusMessage = `${t.done} of ${this.steps} units`;
        t.lastUpdatedAt = this.clock.iso();
      }
    }
  }
  get(owner, taskId) {
    const t = this.#lookup(owner, taskId);
    if (!t) return { error: { code: -32602, message: 'unknown task' } };
    return this.#view(t);
  }
  update(owner, taskId, inputResponses) {
    const t = this.#lookup(owner, taskId);
    if (t && t.status === 'input_required' && inputResponses.confirm) {
      if (inputResponses.confirm.action === 'accept') { t.confirmed = true; t.status = 'working'; }
      else { t.status = 'failed'; t.error = 'declined by the user'; }
      t.lastUpdatedAt = this.clock.iso();
    }
    return {};                                          // unknown or satisfied keys are ignored
  }
  cancel(owner, taskId) {
    const t = this.#lookup(owner, taskId);
    if (t && !TERMINAL.has(t.status)) t.cancelRequested = true;
    return {};                                          // acknowledged; the worker decides when to stop
  }
}

// Requester: the agent host side. `journal` is any Map-like durable store keyed by run step.
export function callToolDurably({ receiver, owner, journal, stepId, name, args, clock, answer, maxPolls = 100, workPerPoll = 1 }) {
  const meta = { 'io.modelcontextprotocol/clientCapabilities': { extensions: { [EXTENSION]: {} } } };
  let entry = journal.get(stepId);
  let taskId = entry && entry.taskId;
  if (!taskId) {
    if (entry && entry.final) return entry.final;
    const res = receiver.callTool(owner, name, args, meta);
    if (res.resultType !== 'task') { journal.set(stepId, { final: res }); return res; }
    taskId = res.taskId;
    journal.set(stepId, { taskId, createdAt: res.createdAt });   // persist before doing anything else
  }
  for (let i = 0; i < maxPolls; i++) {
    receiver.advance(workPerPoll);
    const task = receiver.get(owner, taskId);
    if (task.error && task.error.message === 'unknown task') {
      const final = { status: 'unknown', note: 'task missing (expired or not visible); check side effects with a read' };
      journal.set(stepId, { taskId, final }); return final;
    }
    if (TERMINAL.has(task.status)) { journal.set(stepId, { taskId, final: task }); return task; }
    if (task.status === 'input_required') receiver.update(owner, taskId, answer(task.inputRequests));
    clock.sleep(task.pollIntervalMs ?? 2000);
  }
  return { status: 'still_running', taskId };
}
