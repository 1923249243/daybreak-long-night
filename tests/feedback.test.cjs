'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource, memoryStorage, aimAt } = require('./agent.cjs');

// Controlled position/resource fixtures isolate real input and projectile results.
// They are not campaign-navigation or human-play evidence.
function fixture({ wall = false, boss = false } = {}) {
  const { Game } = loadSource();
  const events = [];
  const game = Game.create({ storage: memoryStorage(), difficulty: 'normal', aimAssist: false,
    onEvent: event => events.push(event) });
  game.start(1); game.begin();
  const s = game.state;
  s.world = { ...s.world, obstacles: wall ? [{ id: 'feedback-wall', x: 0, z: 21, w: 4, d: 1, h: 3 }] : [] };
  Object.assign(s.player, { x: 0, y: 0, z: 24, hp: 100, ammo: 24, reserve: 168, shotCooldown: 0 });
  s.buddy.visible = false;
  s.boss.visible = false;
  const target = boss ? s.boss : { id: 'feedback-target', type: 'soldier', maxHp: 52, hp: 52,
    active: true, warning: 0, shotCooldown: 999, pathTimer: 999, path: [] };
  Object.assign(target, { x: 0, y: 0, z: 18 });
  if (boss) Object.assign(target, { hp: 156, visible: true, active: true, armored: true,
    shotCooldown: 999, moveTimer: 999, path: [] });
  s.enemies = boss ? [] : [target];
  events.length = 0;
  return { game, s, target, events, count: type => events.filter(e => e.type === type).length };
}

function trigger(f, overrides = {}) {
  f.game.update(0.025, { ...aimAt(f.s.player, f.target), fire: true, ...overrides });
}

function releaseAndWait(f) {
  for (let i = 0; i < 10; i++) f.game.update(0.025, {});
}

test('辅助位置专项：真实开火与命中反馈逐次对应，冷却和已倒地目标不产生额外确认', () => {
  const f = fixture();
  trigger(f);
  assert.equal(f.s.player.ammo, 23);
  assert.equal(f.target.hp, 26);
  assert.equal(f.count('shot'), 1, '实际开火必须通知现有枪声音效');
  assert.equal(f.count('hit'), 1, '实际造成伤害必须通知现有命中确认');
  trigger(f); // Still within the real weapon cooldown.
  assert.equal(f.s.player.ammo, 23);
  assert.equal(f.count('shot'), 1);
  assert.equal(f.count('hit'), 1);
  releaseAndWait(f); trigger(f);
  assert.equal(f.s.stats.kills, 1);
  assert.equal(f.count('shot'), 2);
  assert.equal(f.count('hit'), 2);
  releaseAndWait(f); trigger(f);
  assert.equal(f.count('shot'), 3);
  assert.equal(f.count('hit'), 2, '射向已倒地目标不能继续确认命中');
  assert.equal(f.count('hit'), f.s.stats.hits);
  assert.equal(f.count('shot'), f.s.stats.shots);
});

test('辅助位置专项：未击中、墙体遮挡和护甲Boss无伤时只有开火反馈，空弹匣没有开火反馈', () => {
  for (const scenario of ['sky', 'wall', 'armored-boss']) {
    const f = fixture({ wall: scenario === 'wall', boss: scenario === 'armored-boss' });
    const hp = f.target.hp;
    trigger(f, scenario === 'sky' ? { pitch: 1.2 } : {});
    assert.equal(f.s.player.ammo, 23, scenario);
    assert.equal(f.target.hp, hp, scenario);
    assert.equal(f.s.stats.hits, 0, scenario);
    assert.equal(f.count('shot'), 1, scenario + ': 真实开火仍应发声');
    assert.equal(f.count('hit'), 0, scenario + ': 没有真实伤害不能发命中确认');
  }
  const empty = fixture();
  Object.assign(empty.s.player, { ammo: 0, reserve: 0 });
  trigger(empty);
  assert.equal(empty.s.stats.shots, 0);
  assert.equal(empty.count('shot'), 0);
  assert.equal(empty.count('hit'), 0);
});

test('辅助弹道专项：只有实际受伤才发反馈，致死受伤先于死亡，死亡后不重复反馈', () => {
  const f = fixture();
  f.s.enemies = [];
  function bullet(x, damage) {
    f.s.projectiles.push({ x, y: 1, z: 24.6, vx: 0, vy: 0, vz: -21,
      owner: 'enemy', damage, life: 3 });
    f.game.update(0.04, {});
  }
  bullet(2, 10); // A real projectile misses the player's bounds.
  assert.equal(f.s.player.hp, 100);
  assert.equal(f.count('hurt'), 0);
  bullet(0, 10);
  assert.equal(f.s.player.hp, 90);
  assert.equal(f.count('hurt'), 1, '真实生命减少必须通知现有受伤音效');
  f.game.update(0.04, {});
  assert.equal(f.count('hurt'), 1);
  bullet(0, 100);
  assert.equal(f.s.player.hp, 0);
  assert.equal(f.s.mode, 'dead');
  assert.equal(f.count('hurt'), 2);
  assert.equal(f.count('death'), 1);
  const fatalHurt = f.events.findLastIndex(e => e.type === 'hurt');
  const death = f.events.findIndex(e => e.type === 'death');
  assert.ok(fatalHurt < death, '致死一击必须先报告受伤，再报告死亡');
  const count = f.events.length;
  f.game.update(0.04, { fire: true });
  assert.equal(f.events.length, count);
});
