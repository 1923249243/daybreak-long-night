'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource, memoryStorage, createNaturalAgent } = require('./agent.cjs');

test('真实输入代理逐关完成八关，进入最终结局', { timeout: 120000 }, () => {
  const { Game } = loadSource();
  const game = Game.create({ storage: memoryStorage(), difficulty: 'normal', aimAssist: false });
  game.start(1);
  const result = createNaturalAgent(game).run();
  assert.equal(result.final.mode, 'ending');
  assert.deepEqual(result.chapters, [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(result.deaths, 0, '自然通关不能依赖死亡重试');
  assert.equal(result.final.stats.rescued, 12, '第三关十二名伤员必须全部获救且不重复计数');
  assert.ok(result.samples.some(s => s.chapter === 6 && s.buddyDamaged), '第六关九号必须真实损伤');
  assert.ok(result.samples.some(s => s.chapter === 1 && s.boss?.visible), '第一关反派必须实体露面');
  for (const chapter of [7, 8]) {
    assert.ok(result.events.some(e => e.chapter === chapter && e.type === 'boss-hp' && e.after < e.before),
      `第${chapter}关必须记录顾衡承受真实战斗伤害`);
  }
  assert.deepEqual([...game.progress.completed].sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(game.progress.unlocked, 8);
  for (const [chapter, stages] of Object.entries(Game.missionStages)) {
    for (const stage of stages) assert.equal(result.final.flags[`done_${chapter}_${stage}`], true,
      `必须真实完成关卡${chapter}阶段${stage}`);
  }
  for (const flag of ['doctorRescued', 'engineerRescued', 'buddyEvacuated', 'commanderWounded',
    'commanderCaptured', 'civilianBridgeSafe', 'militaryBridgeDestroyed', 'airspaceOpen', 'suppliesCut']) {
    assert.equal(result.final.flags[flag], true, `最终战略结果缺失：${flag}`);
  }
  assert.equal(result.final.boss.captured, true);
  assert.equal(result.final.boss.active, false);
  assert.ok(result.final.boss.hp > 0, '顾衡被活捉');
  assert.equal(result.final.buddy.action, 'safe');
  assert.equal(result.final.player.carrying, null);
  const capture = result.trace.find(s => s.chapter === 8 && s.stage === 'captureCommander');
  assert.ok(capture && result.events.some(e => e.chapter === 8 && e.tick <= capture.tick), '活捉前必须实际打伤反派');
  console.log(JSON.stringify({ scenario: 'natural-input-eight-chapters', ticks: result.ticks,
    simulatedSeconds: result.simulatedSeconds, deaths: result.deaths,
    stats: result.final.stats, stages: result.trace.map(s => `${s.chapter}:${s.stage}`), bossDamage: result.events,
    completed: game.progress.completed, unlocked: game.progress.unlocked,
    outcome: { commanderCaptured: result.final.boss.captured, buddy: result.final.buddy.action,
      civilianBridgeSafe: result.final.flags.civilianBridgeSafe, militaryBridgeDestroyed: result.final.flags.militaryBridgeDestroyed } }));
});
