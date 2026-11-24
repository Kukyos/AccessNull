// Self-check for the parts that don't need a browser: node test.mjs
import assert from 'node:assert/strict';
import { matchLabel, needsConfirm, parseDecision } from './agent.js';

const els = [
  { i: 1, tag: 'a', label: 'Log in' },
  { i: 2, tag: 'button', label: 'Add to Basket' },
  { i: 3, tag: 'a', label: 'Contact us' },
  { i: 4, tag: 'button', label: 'Place your order' },
  { i: 5, tag: 'input', label: 'Search Amazon.in' },
  { i: 6, tag: 'a', label: 'Electronics' },
];
const m = q => matchLabel(q, els)?.i;
assert.equal(m('sign in'), 1, 'synonym sign in -> log in');
assert.equal(m('cart'), 2, 'cart -> basket');
assert.equal(m('contact'), 3);
assert.equal(m('electrnics'), 6, 'one typo tolerated');
assert.equal(m('search'), 5);
assert.equal(m('weather forecast'), undefined, 'no false match');

assert.equal(needsConfirm({ type: 'click' }, els[3]), true, 'place order is gated');
assert.equal(needsConfirm({ type: 'click' }, els[0]), false);
assert.equal(needsConfirm({ type: 'type', risky: true }, els[4]), true, 'model can flag risk too');

const d = parseDecision('sure! {"thought":"x","say":"ok","action":{"type":"click","i":2},"risky":true}');
assert.equal(d.action.i, 2);
assert.equal(d.action.risky, true, 'top-level risky copied onto action');
assert.throws(() => parseDecision('no json here'));
console.log('all agent checks passed');

import { compact } from './agent.js';
const line = compact([{ i: 7, tag: 'select', label: 'Size', options: ['S', 'L'], offscreen: true }, { i: 8, tag: 'input', type: 'email', label: 'Email', value: 'a@b.c' }]);
assert.equal(line, '7 select "Size" [S|L] (offscreen)\n8 input:email "Email" ="a@b.c"');
console.log('compact format ok');
