import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createImageGenerationQueue } from '../src/lib/images/imageGenerationQueue.ts';

test('browser queue caps unique jobs without rejecting legitimate deduplication', async () => {
  const release = [];
  const queue = createImageGenerationQueue({ concurrency: 1, maxPending: 2 });
  const work = () => new Promise(resolve => release.push(resolve));
  const first = queue.run('owner', 'same', work);
  const duplicate = queue.run('owner', 'same', work);
  const second = queue.run('owner', 'different', work);
  assert.strictEqual(duplicate, first);
  await assert.rejects(queue.run('owner', 'third', work), /Too many pending/);
  // Queue work begins after the next microtask turn.
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(release.length, 1);
  release.shift()('first');
  assert.equal(await first, 'first');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(release.length, 1);
  release.shift()('second');
  assert.equal(await second, 'second');
  assert.equal(await queue.run('owner', 'third', () => Promise.resolve('third')), 'third');
});

test('image queue rejects an invalid pending-job limit', () => {
  for (const maxPending of [0, 1, 1.5, Infinity, NaN]) {
    assert.throws(() => createImageGenerationQueue({ concurrency: 2, maxPending }), /queue limit/);
  }
});
