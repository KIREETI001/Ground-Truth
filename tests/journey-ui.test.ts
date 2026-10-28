import test from 'node:test';
import assert from 'node:assert/strict';
import { initialIdentityDraft, settleExplicitSave, selectProjectPath, retainSourceHeadlines } from '../app/components/learner-session.ts';
import type { LearnerState } from '../lib/learner/types.ts';
import type { RadarResult } from '../lib/discovery/types.ts';

const empty = (): LearnerState => ({ version: 1, profile: null, baseline: [], completed: [], project: null });

test('account bootstrap never merges device profile or legacy practice into account state', () => {
  const device = { ...empty(), completed: ['queue-choose'] };
  const remote = { ...empty(), completed: ['sql-choose'] };
  assert.deepEqual(initialIdentityDraft(true, remote, device), remote);
  assert.deepEqual(initialIdentityDraft(true, null, device), empty());
  assert.deepEqual(initialIdentityDraft(false, remote, device), device);
});

test('an account save preserves edits made while its request was in flight', () => {
  const submitted = { ...empty(), completed: ['queue-choose'] };
  const current = { ...submitted, completed: ['queue-choose', 'queue-trace'] };
  const result = settleExplicitSave(current, submitted, submitted);
  assert.deepEqual(result.state.completed, ['queue-choose', 'queue-trace']);
  assert.equal(result.dirty, true);
  assert.equal(settleExplicitSave(submitted, submitted, submitted).dirty, false);
});

test('public project selection accepts listed paths only and stops at five source files', () => {
  const allowed = ['a.ts', 'b.ts', 'c.ts', 'd.ts', 'e.ts', 'f.ts'];
  let selected: string[] = [];
  for (const path of [...allowed, '../secret']) selected = selectProjectPath(selected, path, allowed);
  assert.deepEqual(selected, allowed.slice(0, 5));
  assert.deepEqual(selectProjectPath(selected, 'c.ts', allowed), ['a.ts', 'b.ts', 'd.ts', 'e.ts']);
  assert.deepEqual(selectProjectPath([], '../secret', allowed), []);
});

test('a failed source refresh retains earlier headlines with their original fetch time', () => {
  const item = { id: 'one', title: 'Published update', url: 'https://web.dev/one', publishedAt: '2026-10-20T00:00:00.000Z', learningAngle: 'Trace a request.', missionId: 'async-in-order' };
  const previous: RadarResult = { fetchedAt: '2026-10-27T00:00:00.000Z', sources: [{ id: 'webdev', title: 'web.dev', url: 'https://web.dev/', items: [item], error: null }] };
  const failed: RadarResult = { fetchedAt: '2026-10-28T00:00:00.000Z', sources: [{ ...previous.sources[0], items: [], error: 'Source unavailable' }] };
  const retained = retainSourceHeadlines({ result: previous, staleSources: {} }, failed);
  assert.deepEqual(retained.result.sources[0].items, [item]);
  assert.equal(retained.result.sources[0].error, 'Source unavailable');
  assert.equal(retained.staleSources.webdev, previous.fetchedAt);
  const recovered = retainSourceHeadlines(retained, { ...failed, sources: [{ ...failed.sources[0], error: null }] });
  assert.deepEqual(recovered.result.sources[0].items, []);
  assert.deepEqual(recovered.staleSources, {});
});

import {
  createLearnerSession, activateLearnerIdentity, editLearnerDraft, beginLearnerOperation,
  finishLearnerOperation, failLearnerOperation, hasUnsavedLearnerDrafts, currentAccountBinding,
  accountBindingIsCurrent, type LearnerSession,
} from '../app/components/learner-session.ts';

const recordFor = (state: LearnerState, revision = 'revision-a') => ({ state, revision, expiresAt: '2026-11-28T00:00:00.000Z' });
function loadedAccount(owner: string): LearnerSession {
  const opened = activateLearnerIdentity(createLearnerSession(), owner, empty()).session;
  const started = beginLearnerOperation(opened, 'read');
  assert.ok(started.operation);
  return finishLearnerOperation(started.session, started.operation, recordFor(empty()));
}

test('dirty A draft is hidden under B and restored only when native A returns', () => {
  let session = loadedAccount('account-a');
  session = editLearnerDraft(session, { ...empty(), completed: ['queue-choose'] });
  const original = session.active;
  const switched = activateLearnerIdentity(session, 'account-b', empty());
  session = switched.session;
  assert.equal(session.owner, 'account-b');
  assert.deepEqual(session.active.state, empty());
  assert.equal(session.active.dirty, false);
  assert.equal(hasUnsavedLearnerDrafts(session), true);
  assert.deepEqual(session.quarantined.get('account-a')?.state.completed, ['queue-choose']);
  session = activateLearnerIdentity(session, 'account-a', empty()).session;
  assert.deepEqual(session.active.state, original.state);
  assert.equal(session.active.revision, original.revision);
  assert.equal(session.active.expiresAt, original.expiresAt);
  assert.equal(session.active.accountLoaded, true);
  assert.equal(session.active.dirty, true);
  assert.equal(session.quarantined.has('account-a'), false);
});

test('dirty A draft survives a signed-out guest session without entering guest storage state', () => {
  let session = editLearnerDraft(loadedAccount('account-a'), { ...empty(), completed: ['owner-choose'] });
  const guest = { ...empty(), completed: ['sql-trace'] };
  session = activateLearnerIdentity(session, null, guest).session;
  assert.deepEqual(session.active.state.completed, ['sql-trace']);
  assert.equal(hasUnsavedLearnerDrafts(session), true);
  session = activateLearnerIdentity(session, 'account-a', guest).session;
  assert.deepEqual(session.active.state.completed, ['owner-choose']);
  assert.equal(session.active.dirty, true);
});

test('an in-flight A save settles only its quarantined draft while B remains untouched', () => {
  let session = editLearnerDraft(loadedAccount('account-a'), { ...empty(), completed: ['queue-choose'] });
  const started = beginLearnerOperation(session, 'save');
  assert.ok(started.operation);
  assert.deepEqual(started.operation.headers, { 'X-GroundTruth-Account': 'account-a' });
  session = activateLearnerIdentity(started.session, 'account-b', empty()).session;
  session = editLearnerDraft(session, { ...empty(), completed: ['sql-choose'] });
  const b = session.active;
  session = finishLearnerOperation(session, started.operation, recordFor(started.operation.submitted, 'saved-a'));
  assert.deepEqual(session.active, b);
  assert.equal(session.quarantined.get('account-a')?.revision, 'saved-a');
  assert.equal(session.quarantined.get('account-a')?.dirty, false);
  session = activateLearnerIdentity(session, 'account-a', empty()).session;
  assert.deepEqual(session.active.state.completed, ['queue-choose']);
  assert.equal(session.active.revision, 'saved-a');
});

test('newer A edits survive an earlier successful save across B and back to A', () => {
  let session = editLearnerDraft(loadedAccount('account-a'), { ...empty(), completed: ['queue-choose'] });
  const started = beginLearnerOperation(session, 'save');
  assert.ok(started.operation);
  session = editLearnerDraft(started.session, { ...empty(), completed: ['queue-choose', 'queue-trace'] });
  session = activateLearnerIdentity(session, 'account-b', empty()).session;
  session = activateLearnerIdentity(session, 'account-a', empty()).session;
  session = finishLearnerOperation(session, started.operation, recordFor(started.operation.submitted, 'saved-a'));
  assert.deepEqual(session.active.state.completed, ['queue-choose', 'queue-trace']);
  assert.equal(session.active.revision, 'saved-a');
  assert.equal(session.active.dirty, true);
});

test('a delayed account read cannot replace a different account or newer edits', () => {
  let session = activateLearnerIdentity(createLearnerSession(), 'account-a', empty()).session;
  const started = beginLearnerOperation(session, 'read');
  assert.ok(started.operation);
  session = editLearnerDraft(started.session, { ...empty(), completed: ['async-choose'] });
  session = activateLearnerIdentity(session, 'account-b', empty()).session;
  const b = session.active;
  session = finishLearnerOperation(session, started.operation, recordFor({ ...empty(), completed: ['queue-choose'] }));
  assert.deepEqual(session.active, b);
  session = activateLearnerIdentity(session, 'account-a', empty()).session;
  assert.deepEqual(session.active.state.completed, ['async-choose']);
  assert.equal(session.active.dirty, true);
  assert.equal(session.active.accountLoaded, false);
});

test('stale failures and exports stay bound to their originating identity generation', () => {
  const sessionA = loadedAccount('account-a');
  const binding = currentAccountBinding(sessionA);
  assert.ok(binding);
  const started = beginLearnerOperation(sessionA, 'export');
  assert.ok(started.operation);
  let session = activateLearnerIdentity(started.session, 'account-b', empty()).session;
  assert.equal(accountBindingIsCurrent(session, binding), false);
  const b = session.active;
  session = failLearnerOperation(session, started.operation, 'Export failed for the original account.');
  assert.deepEqual(session.active, b);
  assert.equal(session.active.error, '');
  session = activateLearnerIdentity(session, 'account-a', empty()).session;
  assert.equal(accountBindingIsCurrent(session, binding), false);
  assert.equal(session.active.error, 'Export failed for the original account.');
});

test('intentional deletion removes only the originating quarantine and old responses cannot recreate it', () => {
  let session = editLearnerDraft(loadedAccount('account-a'), { ...empty(), completed: ['queue-choose'] });
  const started = beginLearnerOperation(session, 'delete');
  assert.ok(started.operation);
  session = activateLearnerIdentity(started.session, 'account-b', empty()).session;
  assert.equal(session.quarantined.get('account-a')?.dirty, true);
  const b = session.active;
  session = finishLearnerOperation(session, started.operation);
  assert.deepEqual(session.active, b);
  assert.equal(session.quarantined.has('account-a'), false);
  assert.equal(hasUnsavedLearnerDrafts(session), false);
  session = finishLearnerOperation(session, started.operation, recordFor({ ...empty(), completed: ['owner-choose'] }));
  assert.equal(session.quarantined.has('account-a'), false);
});

test('returning to a clean account retries failed reads while a dirty account keeps its draft', () => {
  let session = activateLearnerIdentity(createLearnerSession(), 'account-a', empty()).session;
  const started = beginLearnerOperation(session, 'read');
  assert.ok(started.operation);
  session = failLearnerOperation(started.session, started.operation, 'Connection interrupted');
  session = activateLearnerIdentity(session, null, empty()).session;
  const retry = activateLearnerIdentity(session, 'account-a', empty());
  assert.equal(retry.restored, true);
  assert.equal(retry.needsRead, true);
  const dirty = editLearnerDraft(retry.session, { ...empty(), completed: ['queue-choose'] });
  const away = activateLearnerIdentity(dirty, 'account-b', empty()).session;
  const returned = activateLearnerIdentity(away, 'account-a', empty());
  assert.equal(returned.needsRead, false);
  assert.deepEqual(returned.session.active.state.completed, ['queue-choose']);
});
