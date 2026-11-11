# 开发接口

独立实现的八关第一人称游戏。主逻辑不依赖 DOM 和 Three.js；渲染器只读状态。

`world.js` 导出 `DaybreakWorld` 与 CommonJS，含 `chapters[1..8]`、`get(id)`。每关 `id,name,theme,bounds{minX,maxX,minZ,maxZ},floorY,start{x,z,yaw},buddyStart,doctorStart,obstacles[{id,x,z,w,d,h,type,color?}],decor,supplies,interactables,spawns,exit`。各关布局独立，角色在单关基准地面活动，第二关场景地面可设 floorY=12 表现高架城区。

`game.js` 导出 `DaybreakGame.create({storage,onEvent,difficulty,aimAssist})`。方法 `start(id=1),begin(),continue(),nextChapter(),restartCheckpoint(),restartChapter(),pause(),resume(),title(),update(dt,input),pathTo(x,z,from?),isWalkable(x,z),saveCheckpoint(reason),setAimAssist(value)`；getter `state,progress,hasSave,persistence`。

输入 `mx,mz` 为世界平面移动方向（前端依据 yaw 转换），`yaw,pitch,fire,interact,reload,sprint,crouch,jump`；interact/reload/jump为按下边沿。相机朝向采用Three默认：水平前方为`(-sin(yaw),-cos(yaw))`，pitch正值向上。yaw/pitch来自输入，逻辑不得自行转镜头。

状态至少含 `mode(title/briefing/playing/paused/dead/chapterComplete/ending),chapter,world,time,player{x,y,z,yaw,pitch,hp,ammo,reserve,reload,hasRifle,carrying},buddy{x,y,z,hp,damaged,action,visible},doctor,patients,enemies[{id,x,y,z,yaw,hp,type}],projectiles[{x,y,z,owner,...}],effects,mission{stage,label,progress,target{x,y?,z,label},saved},supplies,stats,flags,train,boss`。`world.floorY`是场景基准高度，actor.y为绝对脚底高度。`stats.rescued`与八关战略成果跨关保存。反派第一关实体露面，第七关负伤退走，第八关在真正战斗后被俘，状态用boss与flags表达。

关卡机制：1修九号、救林夏、护送守街口；2摧毁侦察车护卫、夺车关闭侦察；3三组担架救十二人；4取电池修列车并夺军用补给；5护工兵撤出伏击（梁肃视角）；6运器材、打开矿道、九号损伤；7争夺要塞、开空域、击退顾衡；8登军列、停重炮、击败并拘押顾衡、带九号全员撤离、断军用支桥保留民用主桥。禁止用调试跳关当真实通关。

`render.js`: `new DaybreakRenderer(canvas)`, `render(state,dt)`, `resize()`, `setQuality(low/medium/high)`, `getInfo()`, `dispose()`。第一人称透视镜头，FOV92，无摇晃/镜头后坐/死亡倒镜头/强制转镜头/动态变焦。近景武器动作独立。只用本仓库原创代码、程序生成模型/纹理、Three MIT和已核许可素材，禁止读取复制旧Saltline bundle。

`story.js`: `DaybreakStory.chapters[1..8]`（id,title,place,location,number,subtitle,intro数组,quote,task,end数组,next,opening），`ending{title,paragraphs,quote}`。其余前端由主Agent整合。
