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
assert.equal(parseDecision('{"say":"x","action":"done","answer":"42"}').action.answer, '42', 'string action shape');
assert.equal(parseDecision('{"type":"scroll","dir":"down"}').action.dir, 'down', 'top-level shape');
console.log('parser shapes ok');

import { isEcho } from './agent.js';
const q = 'everything is filled in. should i continue?';
assert.equal(isEcho('should i continue', q, false, 5000, true), true, 'our own question is echo');
assert.equal(isEcho('yes go for it', q, false, 5000, true), false, 'a real yes is not echo');
assert.equal(isEcho('yes', q, true, 0, true), true, 'while confirming, anything during our speech is echo');
assert.equal(isEcho('yes', q, false, 600, true), true, 'late transcript right after the question is echo');
assert.equal(isEcho('stop', q, true, 0, true), false, 'stop always gets through');
assert.equal(isEcho('order a large pizza for armaan', "i'm listening.", true, 0, false), false, 'a command right after the greeting is heard');
console.log('echo guard ok');

assert.equal(needsConfirm({ type: 'click', risky: true }, { label: 'Add to Cart' }), false, 'add to cart is never gated');
assert.equal(needsConfirm({ type: 'click', risky: true }, { label: 'Proceed to Buy' }), true, 'model risk still gates other buttons');
assert.equal(needsConfirm({ type: 'click' }, { label: 'Place your order' }), true);
console.log('safe list ok');

import { STOP } from './agent.js';
for (const s of ['stop', 'रुको', 'बस करो', 'स्टॉप', 'நிறுத்து', 'ఆపు']) assert.ok(STOP.test(s), `stop: ${s}`);
assert.equal(STOP.test('bastille day facts'), false, 'stop needs a whole word');
console.log('stop words ok');
assert.equal(isEcho('what is on the screen right now', 'checking reddit discussions about the results now.', true, 0, false), false, 'a real question while we talk is not echo');
assert.equal(isEcho('checking reddit discussions about the results', 'checking reddit discussions about the results now.', true, 0, false), true, 'our own line is echo');
console.log('echo words ok');

import { goalLang } from './agent.js';
assert.match(goalLang('YouTube pe Arijit Singh ka latest gaana chalao'), /^Hindi/);
assert.equal(goalLang('ताजमहल किसने बनवाया'), 'Hindi');
assert.equal(goalLang('play the latest video from Marques Brownlee'), null, 'English stays English');
assert.equal(goalLang('add a kurta to my cart and check out'), null, 'one Hindi-looking word is not Hinglish');
console.log('goal language ok');

import { viewCommand } from './agent.js';
assert.deepEqual(viewCommand('make the text bigger').style, ['bigger']);
assert.deepEqual(viewCommand('much bigger text and dark mode').style, ['huge', 'dark']);
assert.equal(viewCommand('keep only the article and the search box').keep, 'the article and the search box');
assert.equal(viewCommand('simplify this page').keep, 'the main content only');
assert.equal(viewCommand('always show amazon like this').save, true);
assert.deepEqual(viewCommand('show the original page').style, ['original']);
assert.equal(viewCommand('play the latest video from marques brownlee'), null, 'tasks are not view commands');
assert.equal(viewCommand('find a bigger water bottle on amazon and add it to my cart please'), null, 'a task saying bigger is not a restyle');
console.log('view commands ok');
import { addressed } from './agent.js';
assert.equal(addressed('Nova, play the latest video'), 'play the latest video');
assert.equal(addressed('Hey Noah play some music'), 'play some music', 'a common mishearing');
assert.equal(addressed('so close your eyes and try to buy a water bottle'), null, 'talking to the judges is not a request');
assert.equal(addressed('the innovation here is'), null, 'innovation is not her name');
console.log('name gate ok');
