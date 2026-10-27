import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateFalImageSubmission } from '../api/_lib/falImageLimits.ts';

const pro = 'fal-ai/nano-banana-pro';
const nano = 'google/nano-banana-2.1';

test('image guard bounds paid output count before provider submission', () => {
  for (const endpoint of [pro, nano]) {
    for (const count of [0, -1, 1.5, 5, 100, Infinity, NaN, '4']) {
      const input = { prompt: 'Create a landscape', num_images: count };
      assert.match(validateFalImageSubmission(endpoint, input), /1 and 4 images/);
    }
    for (const count of [1, 2, 4]) {
      const input = { prompt: 'Create a landscape', num_images: count };
      assert.equal(validateFalImageSubmission(endpoint, input), null);
      assert.equal(input.num_images, count);
    }
  }
});

test('durable internal workers may use synchronous output without bypassing billable limits', () => {
  assert.equal(validateFalImageSubmission(nano, { prompt: 'ok', sync_mode: true }, { allowSynchronous: true }), null);
  assert.match(validateFalImageSubmission(nano, { prompt: 'ok', sync_mode: true }), /recovered/);
  assert.match(validateFalImageSubmission(nano, { prompt: 'ok', num_images: 5, sync_mode: true }, { allowSynchronous: true }), /1 and 4/);
  const internal = { prompt: 'ok', num_images: 1, sync_mode: true };
  assert.equal(validateFalImageSubmission(pro, internal, { allowSynchronous: true }), null);
  assert.equal(internal.limit_generations, true);
});

test('image guard requires recoverable async jobs and bounded generation rounds', () => {
  for (const endpoint of [pro, nano]) {
    assert.match(validateFalImageSubmission(endpoint, { prompt: 'ok', sync_mode: true }), /recovered/);
    assert.match(validateFalImageSubmission(endpoint, { prompt: ' ', sync_mode: false }), /prompts/);
  }
  assert.match(validateFalImageSubmission(pro, { prompt: 'ok', limit_generations: false }), /Unbounded/);
  const proInput = { prompt: 'ok', num_images: 2 };
  assert.equal(validateFalImageSubmission(pro, proInput), null);
  assert.equal(proInput.limit_generations, true);
  const nanoInput = { prompt: 'ok', limit_generations: false, system_prompt: 'legacy' };
  assert.equal(validateFalImageSubmission(nano, nanoInput), null);
  assert.equal('limit_generations' in nanoInput, false);
  assert.equal('system_prompt' in nanoInput, false);
});
