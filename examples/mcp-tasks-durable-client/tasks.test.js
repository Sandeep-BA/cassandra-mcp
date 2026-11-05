// Author: Sandeep Belgavi. Expected-outcome tests for the MCP Tasks example. Standard library only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Receiver, SimClock, callToolDurably, EXTENSION } from './tasks.js';

const accept = () => ({ confirm: { action: 'accept' } });
const args = { publisher: 'Lake View Press', titles: 3120 };

function run(opts = {}, extra = {}) {
  const clock = new SimClock(), receiver = new Receiver(clock, opts), journal = new Map();
  const res = callToolDurably({ receiver, owner: 'catalogue-agent', journal, stepId: 'step-3', name: 'reprice_backlist', args, clock, answer: accept, ...extra });
  return { clock, receiver, journal, res };
}

test('a task-capable client polls, answers the confirmation and gets the synchronous result shape', () => {
  const { res, clock, receiver } = run();
  assert.equal(res.status, 'completed');
  assert.equal(res.result.structuredContent.repriced, 3120);
  assert.equal(receiver.runs, 1);
  assert.ok(clock.sleeps.every(ms => ms === 2000), 'honours pollIntervalMs');
});

test('the task id is journaled before polling, and a resumed run never calls the tool again', () => {
  const clock = new SimClock(), receiver = new Receiver(clock, { steps: 50 }), journal = new Map();
  const first = callToolDurably({ receiver, owner: 'catalogue-agent', journal, stepId: 'step-3', name: 'reprice_backlist', args, clock, answer: accept, maxPolls: 3 });
  assert.equal(first.status, 'still_running');
  assert.ok(journal.get('step-3').taskId);
  // host restarts: same journal, fresh loop
  const second = callToolDurably({ receiver, owner: 'catalogue-agent', journal, stepId: 'step-3', name: 'reprice_backlist', args, clock, answer: accept });
  assert.equal(second.status, 'completed');
  assert.equal(receiver.runs, 1, 'exactly one re-pricing run on the server');
});

test('a client that does not declare the extension gets a synchronous result', () => {
  const clock = new SimClock(), receiver = new Receiver(clock);
  const res = receiver.callTool('catalogue-agent', 'reprice_backlist', args, {});
  assert.equal(res.resultType, undefined);
  assert.equal(res.structuredContent.repriced, 3120);
  const tasked = receiver.callTool('catalogue-agent', 'reprice_backlist', args, { 'io.modelcontextprotocol/clientCapabilities': { extensions: { [EXTENSION]: {} } } });
  assert.equal(tasked.resultType, 'task');
  for (const k of ['taskId', 'status', 'createdAt', 'lastUpdatedAt', 'ttlMs', 'pollIntervalMs']) assert.ok(k in tasked, k);
});

test('cancellation is cooperative: acknowledged at once, effective at the next unit of work', () => {
  const clock = new SimClock(), receiver = new Receiver(clock, { steps: 10, confirmAt: 99 });
  const t = receiver.callTool('a', 'reprice_backlist', args, { 'io.modelcontextprotocol/clientCapabilities': { extensions: { [EXTENSION]: {} } } });
  receiver.advance(3);
  assert.deepEqual(receiver.cancel('a', t.taskId), {});
  assert.equal(receiver.get('a', t.taskId).status, 'working');
  receiver.advance(1);
  const after = receiver.get('a', t.taskId);
  assert.equal(after.status, 'cancelled');
  assert.match(after.statusMessage, /after 3 of 10/);   // side effects already happened
});

test('another owner cannot read or cancel a task', () => {
  const clock = new SimClock(), receiver = new Receiver(clock);
  const t = receiver.callTool('a', 'reprice_backlist', args, { 'io.modelcontextprotocol/clientCapabilities': { extensions: { [EXTENSION]: {} } } });
  assert.equal(receiver.get('b', t.taskId).error.message, 'unknown task');
  receiver.cancel('b', t.taskId); receiver.advance(1);
  assert.notEqual(receiver.get('a', t.taskId).status, 'cancelled');
});

test('a task that expires during a long wait is reported as unknown, not failed', () => {
  const { res } = run({ ttlMs: 5000, steps: 50, confirmAt: 99 });
  assert.equal(res.status, 'unknown');
});

test('a declined confirmation fails the task with a JSON-RPC error', () => {
  const { res } = run({}, { answer: () => ({ confirm: { action: 'decline' } }) });
  assert.equal(res.status, 'failed');
  assert.equal(res.error.code, -32603);
});
