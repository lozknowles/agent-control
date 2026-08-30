import assert from 'node:assert/strict';
import test from 'node:test';
import {isCompleteLargeContextReview} from './operator-review-actions.js';

const sections = ['What I would delete or simplify', 'CURRENT', 'PROPOSED', 'Quick wins', 'Structural improvements', 'Experimental ideas'].join('\n');

test('large-context review gate requires substantial complete architecture output', () => {
  assert.equal(isCompleteLargeContextReview(`${sections}\n${'repository evidence '.repeat(500)}`), true);
  assert.equal(isCompleteLargeContextReview(`${sections}\nshort`), false);
  assert.equal(isCompleteLargeContextReview(`${sections.replace('PROPOSED', 'TARGET')}\n${'repository evidence '.repeat(500)}`), false);
});

test('large-context review gate rejects a provider-completed role-confusion refusal', () => {
  const refusal = `# Ox Invocation Gate: FAIL — Review Not Performed\n${sections}\n${'I cannot invoke Ox. '.repeat(500)}`;
  assert.equal(isCompleteLargeContextReview(refusal), false);
});
