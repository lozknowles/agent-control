import assert from 'node:assert/strict';
import test from 'node:test';
import {prepareSpokenText,speechContentCoverage} from './speech-text.js';
test('speech content comparison rejects changed counts and reversed negation',()=>{
  assert.equal(speechContentCoverage('Three jobs await approval.','Four jobs await approval.').matched,false);
  assert.equal(speechContentCoverage('Publication is approved.','Publication is not approved.').matched,false);
  assert.equal(speechContentCoverage('No jobs are running.','Jobs are running.').matched,false);
  assert.equal(speechContentCoverage('3 jobs await approval.','Three jobs await approval.').matched,true);
  assert.equal(speechContentCoverage('Agent Control status. Waiting work is zero.','Agent control status, waiting work is zero.').matched,true);
});
test('speech rendering preserves an explicit spoken form without authority glyphs',()=>{
  assert.equal(prepareSpokenText('Waiting work: 0 (agent control)'),'Waiting work, zero.');
});
