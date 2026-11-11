'use strict';

const path = require('node:path');

function loadSource() {
  const root = process.env.DAYBREAK_SOURCE_DIR || path.resolve(__dirname, '..');
  const worldModule = require(path.join(root, 'world.js'));
  const gameModule = require(path.join(root, 'game.js'));
  return {
    World: worldModule.DaybreakWorld || worldModule,
    Game: gameModule.DaybreakGame || gameModule,
  };
}

function memoryStorage() {
  const data = new Map();
  return {
    getItem: key => data.has(key) ? data.get(key) : null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: key => data.delete(key),
    clear: () => data.clear(),
  };
}

function aimAt(player, target, eyeHeight = 1.68, targetHeight = 1.0) {
  const dx = target.x - player.x;
  const dz = target.z - player.z;
  const dy = (target.y || 0) + targetHeight - ((player.y || 0) + eyeHeight);
  return { yaw: Math.atan2(-dx, -dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)) };
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

// Exact segment/AABB query for navigation and aiming; it never alters game state.
function blocked(from, to, obstacles, floorY = 0, margin = 0) {
  for (const o of obstacles || []) {
    if (o.solid === false || o.type === 'paint' || o.type === 'decal') continue;
    const min = [o.x - o.w / 2 - margin, o.y ?? floorY, o.z - o.d / 2 - margin];
    const max = [o.x + o.w / 2 + margin, (o.y ?? floorY) + o.h, o.z + o.d / 2 + margin];
    const a = [from.x, from.y, from.z], b = [to.x, to.y, to.z];
    let lo = 0, hi = 1;
    for (let k = 0; k < 3 && lo <= hi; k++) {
      const d = b[k] - a[k];
      if (Math.abs(d) < 1e-9) {
        if (a[k] < min[k] || a[k] > max[k]) { lo = 2; break; }
      } else {
        let t0 = (min[k] - a[k]) / d, t1 = (max[k] - a[k]) / d;
        if (t0 > t1) [t0, t1] = [t1, t0];
        lo = Math.max(lo, t0); hi = Math.min(hi, t1);
      }
    }
    if (lo <= hi && hi > 1e-5 && lo < 0.99999) return true;
  }
  return false;
}

function visibleEnemies(state) {
  const eye = { ...state.player, y: state.player.y + 1.68 };
  const actors = [...(state.enemies || []), ...(state.boss?.active && state.boss.visible ? [state.boss] : [])];
  return actors.filter(e => e.hp > 0 && !e.friendly && e.active !== false &&
    !blocked(eye, { ...e, y: (e.y || 0) + 1 }, state.world.obstacles, state.world.floorY))
    .sort((a, b) => distance(state.player, a) - distance(state.player, b));
}

function nextWaypoint(game, destination) {
  const player = game.state.player;
  const route = game.pathTo(destination.x, destination.z) || [];
  return route.find(p => distance(player, p) > 0.65) || destination;
}

function createNaturalAgent(game, options = {}) {
  const dt = options.dt || 0.04;
  const trace = [], chapters = new Set(), events = [];
  let ticks = 0, deaths = 0, lastKey = '', stalled = 0, priorPosition;
  let reloadWasPressed = false, interactWasPressed = false;
  let lastChapter = 0;
  const samples = [];
  function step() {
    const s = game.state;
    if (s.mode === 'briefing') { game.begin(); return; }
    if (s.mode === 'chapterComplete') { game.nextChapter(); return; }
    if (s.mode === 'dead') {
      deaths++;
      if (!options.allowDeaths) throw new Error(`Natural agent died in chapter ${s.chapter}, stage ${s.mission.stage}`);
      game.restartCheckpoint(); return;
    }
    if (s.mode === 'ending') return;
    if (s.mode !== 'playing') throw new Error(`Unexpected mode ${s.mode}`);
    chapters.add(s.chapter);
    if (lastChapter !== s.chapter) {
      priorPosition = undefined; stalled = 0; lastChapter = s.chapter;
      reloadWasPressed = false; interactWasPressed = false;
    }
    const key = `${s.chapter}:${s.mission.stage}:${s.mission.label}`;
    if (key !== lastKey) { trace.push({ chapter: s.chapter, stage: s.mission.stage, label: s.mission.label, tick: ticks }); lastKey = key; }
    const enemies = visibleEnemies(s);
    const enemy = enemies[0];
    let destination = s.mission.target || s.world.exit || s.player;
    if (enemy && !s.player.carrying && distance(s.player, enemy) < (options.combatRange || 34)) destination = enemy;
    const supply = s.supplies.filter(q => q.readyAt <= s.time).sort((a, b) => distance(s.player, a) - distance(s.player, b))[0];
    if (supply && (s.player.hp < 50 || s.player.ammo + s.player.reserve < 16)) destination = supply;
    let angles = enemy ? aimAt(s.player, enemy) : { yaw: s.player.yaw, pitch: 0 };
    const waypoint = nextWaypoint(game, destination);
    const d = distance(s.player, waypoint);
    let mx = d > 0.45 ? (waypoint.x - s.player.x) / d : 0;
    let mz = d > 0.45 ? (waypoint.z - s.player.z) / d : 0;
    // Hold a short firing distance instead of running through a visible opponent.
    if (enemy && destination === enemy && distance(s.player, enemy) < 9) { mx = 0; mz = 0; }
    if (s.action) { mx = 0; mz = 0; }
    if (priorPosition && Math.hypot(s.player.x - priorPosition.x, s.player.z - priorPosition.z) < 0.002 && (mx || mz)) stalled++;
    else stalled = 0;
    priorPosition = { x: s.player.x, z: s.player.z };
    const wantReload = s.player.ammo < 1 && s.player.reserve > 0 && !s.player.reload;
    const reload = wantReload && !reloadWasPressed;
    reloadWasPressed = reload;
    const interact = ticks % 8 === 0 && !interactWasPressed;
    interactWasPressed = interact;
    const input = { mx, mz, ...angles, fire: !!enemy && !s.player.carrying && s.player.ammo > 0, reload, interact, sprint: !enemy, jump: stalled > 20 && ticks % 20 === 0 };
    samples.push({ chapter: s.chapter, stage: s.mission.stage, hp: s.player.hp, ammo: s.player.ammo, reserve: s.player.reserve,
      rescued: s.stats.rescued, boss: s.boss ? JSON.parse(JSON.stringify(s.boss)) : null,
      flags: { ...s.flags }, buddyDamaged: s.buddy && s.buddy.damaged, tick: ticks });
    if (samples.length > 1 && samples.at(-2).chapter === s.chapter && samples.at(-2).boss && samples.at(-1).boss && samples.at(-1).boss.hp < samples.at(-2).boss.hp)
      events.push({ chapter: s.chapter, type: 'boss-hp', before: samples.at(-2).boss.hp, after: samples.at(-1).boss.hp, tick: ticks });
    game.update(dt, input);
    ticks++;
    if (stalled > 1800) throw new Error(`Natural agent stuck: ${JSON.stringify({ chapter: s.chapter, mission: s.mission, player: s.player, destination, waypoint })}`);
  }
  function run(limit = options.maxTicks || 120000) {
    while (game.state.mode !== 'ending' && ticks < limit) step();
    if (game.state.mode !== 'ending') throw new Error(`Natural agent timed out: ${JSON.stringify({ ticks, chapter: game.state.chapter, mission: game.state.mission, player: game.state.player })}`);
    return { ticks, simulatedSeconds: ticks * dt, deaths, chapters: [...chapters], trace, events, samples, final: game.state };
  }
  return { step, run, trace, events, samples };
}

module.exports = { loadSource, memoryStorage, aimAt, blocked, distance, visibleEnemies, createNaturalAgent };
