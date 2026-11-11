'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource, memoryStorage, blocked, distance, aimAt } = require('./agent.cjs');

function playing() {
  const { Game } = loadSource();
  const game = Game.create({ storage: memoryStorage(), difficulty: 'normal', aimAssist: false });
  game.start(1);
  if (game.state.mode === 'briefing') game.begin();
  assert.equal(game.state.mode, 'playing');
  return game;
}

test('辅助解锁专项：八个独立布局的起点与目的地交互范围由步行路径连通', () => {
  const { Game, World } = loadSource();
  const layouts = new Set();
  for (let chapter = 1; chapter <= 8; chapter++) {
    const world = World.get(chapter);
    assert.ok(world, `chapter ${chapter}`);
    layouts.add(JSON.stringify({ bounds: world.bounds, start: world.start, obstacles: world.obstacles }));
    const storage = memoryStorage();
    storage.setItem(Game.storageKey, JSON.stringify({ v: 1, unlocked: 8, completed: [], checkpoint: null }));
    const game = Game.create({ storage });
    game.start(chapter);
    const targets = [world.exit, ...(world.interactables || []), ...(world.supplies || [])].filter(p => p && Number.isFinite(p.x) && Number.isFinite(p.z));
    for (const target of targets) {
      const candidates = [target];
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) candidates.push({ x: target.x + Math.cos(a) * 1.8, z: target.z + Math.sin(a) * 1.8 });
      const route = candidates.map(p => game.pathTo(p.x, p.z) || []).find(r => r.length && distance(r.at(-1), target) <= 2.25) || [];
      assert.ok(route.length || distance(world.start, target) < 2, `chapter ${chapter}: unreachable interaction radius ${target.id || 'exit'}`);
      for (const point of route) assert.ok(game.isWalkable(point.x, point.z), `chapter ${chapter}: route point in obstacle`);
    }
  }
  assert.equal(layouts.size, 8);
});

test('暂停冻结时间、玩家、敌人和任务；恢复后继续', () => {
  const game = playing();
  game.pause();
  assert.equal(game.state.mode, 'paused');
  const before = JSON.stringify(game.state);
  for (let i = 0; i < 25; i++) game.update(0.04, { mx: 1, mz: 1, fire: true, reload: true, interact: true, jump: true });
  assert.equal(JSON.stringify(game.state), before);
  game.resume();
  assert.equal(game.state.mode, 'playing');
  const time = game.state.time;
  game.update(0.04, {});
  assert.ok(game.state.time > time);
});

test('跨实例隔离，保存后新实例可继续，独立存储不会污染', () => {
  const { Game } = loadSource();
  const storage = memoryStorage();
  const a = Game.create({ storage });
  const b = Game.create({ storage: memoryStorage() });
  a.start(1); a.begin();
  assert.notStrictEqual(a.state, b.state);
  const untouched = JSON.stringify(b.state);
  a.update(0.04, { mx: 1, mz: 0 });
  a.saveCheckpoint('independent-qa');
  assert.equal(JSON.stringify(b.state), untouched);
  const c = Game.create({ storage });
  assert.equal(c.hasSave, true);
  c.continue();
  assert.equal(c.state.chapter, 1);
  assert.ok(Math.abs(c.state.player.x - a.state.player.x) < 0.001);
  assert.equal(b.hasSave, false);
});

test('辅助位置专项：实体墙与地图边界阻挡实际移动', () => {
  const game = playing(), s = game.state;
  const wall = s.world.obstacles.find(o => o.h >= 2 && o.w >= 1 && o.d >= 1 &&
    game.isWalkable(o.x - o.w / 2 - 1, o.z));
  assert.ok(wall, '需要一面可从侧面接近的实体墙');
  Object.assign(s.player, { x: wall.x - wall.w / 2 - 1, z: wall.z, y: s.world.floorY, hp: 100000 });
  for (let i = 0; i < 100; i++) game.update(0.04, { mx: 1, mz: 0 });
  assert.ok(s.player.x < wall.x - wall.w / 2, '不能穿过墙面');
  assert.ok(game.isWalkable(s.player.x, s.player.z));
  Object.assign(s.player, { x: s.world.bounds.minX + 1, z: s.world.start.z });
  for (let i = 0; i < 100; i++) game.update(0.04, { mx: -1, mz: 0 });
  assert.ok(s.player.x >= s.world.bounds.minX);
});

test('辅助状态专项：死亡后恢复检查点，而非复活于死亡位置', () => {
  const game = playing(), s = game.state;
  game.saveCheckpoint('qa-death-restore');
  const saved = { x: s.player.x, z: s.player.z, stage: s.mission.stage };
  s.player.x += 2;
  s.player.hp = 1;
  s.enemies = [];
  s.projectiles.push({ x: s.player.x, y: s.player.y + 1, z: s.player.z + 0.4,
    vx: 0, vy: 0, vz: -21, owner: 'enemy', damage: 100, life: 3 });
  game.update(0.04, {});
  assert.equal(game.state.mode, 'dead');
  game.restartCheckpoint();
  assert.equal(game.state.mode, 'playing');
  assert.ok(game.state.player.hp > 0);
  assert.equal(game.state.mission.stage, saved.stage);
  assert.ok(Math.hypot(game.state.player.x - saved.x, game.state.player.z - saved.z) < 0.001);
});

test('三维遮挡几何夹具包含高墙、矮掩体和高架高度', () => {
  const wall = { x: 0, z: 0, w: 2, d: 2, h: 3 };
  assert.equal(blocked({ x: -4, y: 1.65, z: 0 }, { x: 4, y: 1, z: 0 }, [wall]), true);
  assert.equal(blocked({ x: -4, y: 4, z: 0 }, { x: 4, y: 4, z: 0 }, [wall]), false);
  assert.equal(blocked({ x: -4, y: 13.65, z: 0 }, { x: 4, y: 13, z: 0 }, [wall], 12), true);
});

test('辅助位置专项：向天开枪不能命中；真实三维墙体阻挡，而高处射线越过矮掩体', () => {
  function scenario({ pitch, height = 0, wallHeight = 0 }) {
    const game = playing(), s = game.state;
    s.world = { ...s.world, obstacles: wallHeight ? [{ id: 'qa-wall', x: 0, z: 21, w: 4, d: 1, h: wallHeight }] : [] };
    Object.assign(s.player, { x: 0, y: height, z: 24, hp: 100, ammo: 24, reserve: 168, shotCooldown: 0 });
    s.buddy.visible = false;
    const enemy = { ...s.enemies[0], x: 0, y: height, z: 18, hp: 500, maxHp: 500, shotCooldown: 9999, pathTimer: 9999, path: [] };
    s.enemies = [enemy];
    const angles = aimAt(s.player, enemy);
    for (let i = 0; i < 20; i++) game.update(0.025, { ...angles, pitch: pitch ?? angles.pitch, fire: true });
    assert.ok(s.stats.shots > 0, '必须实际扣除弹药并开枪');
    return enemy.hp;
  }
  assert.equal(scenario({ pitch: 1.2 }), 500);
  assert.ok(scenario({}) < 500);
  assert.equal(scenario({ wallHeight: 3 }), 500);
  assert.ok(scenario({ wallHeight: 0.4 }) < 500);
});

test('辅助资源专项：补给重复使用有冷却；耗尽弹药后真实等待获得可射击弹药', () => {
  const game = playing(), s = game.state;
  s.enemies = []; s.buddy.visible = false;
  const supply = s.supplies[0];
  Object.assign(s.player, { x: supply.x, z: supply.z, hp: 20, ammo: 0, reserve: 0 });
  game.update(0.025, { interact: true });
  assert.ok(s.player.hp > 20 && s.player.ammo + s.player.reserve > 0);
  const count = s.stats.supplies;
  game.update(0.025, {}); game.update(0.025, { interact: true });
  assert.equal(s.stats.supplies, count);
  for (let i = 0; i < 730; i++) game.update(0.025, {});
  game.update(0.025, { interact: true });
  assert.equal(s.stats.supplies, count + 1);
  Object.assign(s.player, { ammo: 0, reserve: 0, reload: 0 });
  for (let i = 0; i < 400; i++) game.update(0.025, {});
  assert.ok(s.player.ammo > 0, '总弹药耗尽后不能永久死锁');
});
