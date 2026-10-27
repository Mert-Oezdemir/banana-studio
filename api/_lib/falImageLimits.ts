/** Fail closed before sending an image request to a metered fal endpoint.
 * This caps outputs per submission; it is NOT a billing-period budget.
 * Provider token charges and references can cost more than output estimates.
 */
export const validateFalImageSubmission = (endpoint: string, input: Record<string, unknown>,
  { allowSynchronous = false }: { allowSynchronous?: boolean } = {}): string | null => {
  const count = input.num_images ?? 1;
  if (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 1 || count > 4) {
    return 'Choose between 1 and 4 images per request. No provider request was sent.';
  }
  // Queue-based jobs must stay recoverable after a lost HTTP response.
  if (input.sync_mode != null && input.sync_mode !== false && !(allowSynchronous && input.sync_mode === true)) {
    return 'Synchronous image output is disabled so jobs can be recovered.';
  }
  if (typeof input.prompt !== 'string' || !input.prompt.trim() || input.prompt.length > 50_000) {
    return 'Image prompts must contain 1–50,000 characters.';
  }
  if (endpoint.startsWith('fal-ai/nano-banana-pro')) {
    if (input.limit_generations === false) {
      return 'Unbounded prompt-controlled generation rounds are disabled.';
    }
    if (input.limit_generations != null && input.limit_generations !== true) {
      return 'Invalid generation round limit.';
    }
    input.limit_generations = true;
  } else if (endpoint.startsWith('google/nano-banana-2.1')) {
    // Pro-only flags should not leak into Nano Banana 2.1 submissions.
    delete input.limit_generations;
    delete input.system_prompt;
  }
  input.num_images = count;
  return null;
};
