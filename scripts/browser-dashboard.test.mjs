import assert from 'node:assert/strict'; import fs from 'node:fs'; import test from 'node:test';
const source=fs.readFileSync(new URL('../assets/dashboard/dashboard-enhancements.js',import.meta.url),'utf8');
test('running dashboard exposes browser capability node transport engine and reason',()=>{for(const label of['Capability / route','Node / transport','Engine','Routing reason','Chromium/Playwright','chatgpt.web','chatgpt.android'])assert.match(source,new RegExp(label.replace('/','\\/')));});
