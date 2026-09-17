# game-config.json 逐字段说明

配置入口：[src/game-config.json](src/game-config.json)。修改流程见 [CONFIGURATION.md](CONFIGURATION.md)。本表由 `node scripts/config-fields.mjs` 生成，列出的当前值以生成时的 JSON 为准。

时间=秒，距离=世界像素，速度=像素/秒；明确标注屏幕像素的字段用于界面。概率/进度使用 0～1。`[]` 表示数组中每一项，坐标数组行的值是示例，不是所有点都相同。JSON 中 `_说明` 与 `_字段说明` 为阅读说明，不参与游戏规则。

搬运挣脱：每秒进度为 `1 / carryPlayerTime`，每次有效主动挣扎再加 `wiggleGain`。输入间隔不能短于 `wiggleInterval`。当前玩家自然挣脱 32 秒，连续有效挣扎理论约 12.6 秒，实际受帧间隔影响。AI 自然挣脱 22 秒。

## core

| 字段 | 当前值 / 类型 | 含义与单位 |
| --- | --- | --- |
| `core.survivorSpeed` | `112` | 求生者奔跑速度，像素/秒 |
| `core.crouchSpeed` | `30` | 求生者蹲行速度，像素/秒 |
| `core.killerSpeed` | `122` | 屠夫基础移动速度，像素/秒 |
| `core.terrorRadius` | `600` | 恐惧心跳范围，像素 |
| `core.repairTime` | `48` | 单人修好一台发电机的基础秒数 |
| `core.repairLockTime` | `3` | 修机校准失败后的禁止维修秒数 |
| `core.healTime` | `12` | 一名队友完成一个治疗阶段的基础秒数 |
| `core.gateTime` | `16` | 出口门读条秒数 |
| `core.hookPhase` | `60` | 每次挂钩阶段的秒数 |
| `core.rescueTime` | `1.5` | 救下挂钩队友的读条秒数 |
| `core.carryPlayerTime` | `32` | 真人被搬运且不主动挣扎时，自动挣脱所需秒数 |
| `core.carryAITime` | `22` | AI 被搬运时自动挣脱所需秒数 |
| `core.wiggleInterval` | `0.25` | 主动挣扎两次有效输入的最短间隔，秒 |
| `core.wiggleGain` | `0.012` | 每次有效挣扎增加的进度，0～1 |
| `core.bleedTime` | `60` | 倒地累计失血死亡时间，秒；被扶起不重置已消耗预算 |
| `core.endgameTime` | `100` | 终局倒计时，秒 |
| `core.attackRange` | `48` | 屠夫普通攻击距离，像素 |
| `core.lungeRange` | `74` | 屠夫突刺判定距离，像素 |
| `core.attackHalfAngle` | `0.3141592653589793` | 攻击扇形半角，弧度 |
| `core.maxChargeTime` | `0.55` | 按住攻击达到满蓄力的秒数 |
| `core.lockerAlertDelay` | `20` | 藏入衣柜后第一次乌鸦警报延迟，秒 |
| `core.lockerAlertInterval` | `15` | 衣柜后续乌鸦警报间隔，秒 |
| `core.nearVision` | `65` | 屠夫近距离全向感知半径，像素 |
| `core.survivorNearVision` | `75` | 求生者近距离全向感知半径，像素 |
| `core.vision` | `560` | 屠夫角色可见距离，null 表示无限；不是镜头缩放 |
| `core.survivorVision` | `520` | 求生者角色可见距离，null 表示无限 |
| `core.survivorHalfAngle` | `1.2217304763960306` | 求生者视野半角，弧度；π 为全向 |
| `core.killerHalfAngle` | `1.2217304763960306` | 屠夫视野半角，弧度；π 为全向 |

## movement

| 字段 | 当前值 / 类型 | 含义与单位 |
| --- | --- | --- |
| `movement.walkSpeed` | `72` | 求生者不奔跑时的步行速度，像素/秒 |
| `movement.crawlSpeed` | `23` | 倒地爬行速度，像素/秒 |
| `movement.carrySpeed` | `89` | 屠夫搬运时的移动速度，像素/秒 |
| `movement.chargeMultiplier` | `0.72` | 蓄力时速度乘数 |
| `movement.boostMultiplier` | `1.45` | 受伤或保护加速时的速度乘数 |
| `movement.recoveryMultiplier` | `0.4` | 攻击冷却时屠夫速度乘数 |
| `movement.bodyDiameter` | `20` | 角色之间阻挡的最小中心距离，像素 |
| `movement.collisionRadius` | `10` | 角色移动的碰撞半径，像素 |
| `movement.pathRadius` | `11` | 寻路与部分翻越检查的预留半径，像素 |
| `movement.boostSeconds` | `2` | 受击与挣脱等加速持续秒数 |
| `movement.recentMotionSeconds` | `0.12` | 判定刚刚移动过的时间窗口，秒 |
| `movement.fastVaultSpeed` | `100` | 快翻需要的实际接近速度，像素/秒 |
| `movement.carryDropOffset` | `28` | 放下被搬运者时的候选位置偏移，像素 |

## actions

| 字段 | 当前值 / 类型 | 含义与单位 |
| --- | --- | --- |
| `actions.hitRecovery` | `3.2` | 命中攻击基础恢复秒数 |
| `actions.missRecovery` | `0.9` | 未命中攻击基础恢复秒数 |
| `actions.chargeRecovery` | `0.8` | 满蓄力额外恢复秒数，按蓄力比例缩放 |
| `actions.lungeThreshold` | `0.25` | 超过此蓄力比例触发突刺，0～1 |
| `actions.hookSeconds` | `0.9` | 挂人读条秒数 |
| `actions.breakPalletSeconds` | `2.3` | 踩碎木板读条秒数 |
| `actions.kickSeconds` | `1.8` | 踢发电机读条秒数 |
| `actions.kickLoss` | `0.05` | 踢机直接损失的进度，0～1 |
| `actions.repairPeerPenalty` | `0.15` | 每多一名修机者的单人效率折损系数 |
| `actions.regressionMultiplier` | `0.2` | 无人维修时回退速率相对基础修机速率的倍率 |
| `actions.recoverCap` | `0.95` | 倒地自我恢复上限，0～1 |
| `actions.recoverSeconds` | `26` | 自我恢复从 0 到 1 的理论秒数，实际受上限限制 |
| `actions.rescueProtection` | `8` | 救援后被救者的保护秒数 |
| `actions.rescueTransition` | `0.35` | 脱钩动作过渡秒数 |
| `actions.pickupCooldown` | `1` | 抱起以及挂人后的屠夫冷却秒数 |
| `actions.dropCarriedCooldown` | `0.7` | 主动放下幸存者后的屠夫冷却秒数 |
| `actions.maxHooks` | `3` | 达到此挂钩次数时立即献祭 |
| `actions.selfRescueChance` | `0.04` | 第一阶段主动自救成功概率，0～1 |
| `actions.selfRescuePenalty` | `12` | 每次主动自救消耗的挂钩时间，秒 |
| `actions.selfRescueCooldown` | `1.5` | 主动自救尝试间隔，秒 |
| `actions.wiggleProtection` | `3` | 挣脱搬运后的保护秒数 |
| `actions.wiggleStun` | `3` | 挣脱搬运对屠夫造成的眩晕秒数 |
| `actions.stunSeconds` | `2.6` | 放板砸中屠夫的眩晕秒数 |
| `actions.stunRadius` | `65` | 放板命中屠夫的判定半径，像素 |
| `actions.breakImpacts` | `[0.35,0.85]` | 踩板过程产生冲击声音的进度点数组，每项 0～1 |
| `actions.kickImpact` | `0.7` | 踢机过程产生踢击声音的进度点，0～1 |
| `actions.healPerHelperMultiplier` | `1` | 每名治疗者贡献的治疗倍率，多人相加 |

## traversal

| 字段 | 当前值 / 类型 | 含义与单位 |
| --- | --- | --- |
| `traversal.stairsRange` | `32` | 楼梯交互中心距离，像素 |
| `traversal.stairsSeconds` | `0.55` | 上下楼动作秒数 |
| `traversal.stairsCooldown` | `0.6` | 上下楼后的冷却秒数 |
| `traversal.dropRange` | `37` | 高处跳落交互距离，像素 |
| `traversal.dropSeconds` | `0.7` | 跳落动作秒数 |
| `traversal.killerLandingSeconds` | `0.8` | 屠夫落地后冷却秒数 |
| `traversal.survivorLandingSeconds` | `1.15` | 求生者落地后冷却秒数 |
| `traversal.palletRange` | `58` | 放板与翻板交互距离，像素 |
| `traversal.palletOffset` | `36` | 翻板后距木板中心的偏移，像素 |
| `traversal.palletDropSeconds` | `0.18` | 跑动放板跨到另一侧的角色过渡秒数；不是板子倾倒动画时长 |
| `traversal.palletFastSeconds` | `0.7` | 快翻板秒数 |
| `traversal.palletSlowSeconds` | `1.5` | 慢翻板秒数 |
| `traversal.windowRange` | `62` | 翻窗交互距离，像素 |
| `traversal.windowOffset` | `32` | 翻窗落点离窗中心的横向偏移，像素 |
| `traversal.killerWindowSeconds` | `1.1` | 屠夫翻窗秒数 |
| `traversal.windowFastSeconds` | `0.55` | 求生者快翻窗秒数 |
| `traversal.windowSlowSeconds` | `1.25` | 求生者慢翻窗秒数 |
| `traversal.palletDropCooldown` | `0.35` | 放板后的操作冷却秒数 |
| `traversal.palletUnstuckOffsets` | `[26,38,50]` | 放板后若角色重叠，按顺序尝试的脱困偏移数组，像素 |

## interactions

| 字段 | 当前值 / 类型 | 含义与单位 |
| --- | --- | --- |
| `interactions.defaultRange` | `58` | 未单独指定的交互范围，像素 |
| `interactions.repairRange` | `60` | 修机交互范围，像素 |
| `interactions.healRange` | `44` | 治疗交互范围，像素 |
| `interactions.rescueRange` | `48` | 救援交互范围，像素 |
| `interactions.lockerRange` | `48` | 衣柜交互范围，像素 |
| `interactions.gateRange` | `65` | 出口门交互范围，像素 |
| `interactions.workRange` | `66` | 已开始的工作允许保持的最大距离，像素 |
| `interactions.healStandOff` | `21` | 治疗者靠近患者后的站位距离，像素 |
| `interactions.rescueStandOff` | `25` | 救援者靠近挂钩者后的站位距离，像素 |
| `interactions.workStandOff` | `32` | 其他工作靠近目标后的站位距离，像素 |
| `interactions.workApproachRate` | `12` | 工作时自动靠近目标的指数速度系数，越大靠近越快 |
| `interactions.pickupRange` | `45` | 抱起倒地幸存者的距离，像素 |
| `interactions.vaultGrabRange` | `42` | 抓住正在翻窗的受伤幸存者的距离，像素 |
| `interactions.vaultGrabCosine` | `0.35` | 翻窗抓取方向判定的余弦阈值，越大角度越窄 |
| `interactions.workGrace` | `0.12` | 工作动画判为仍在进行的宽限秒数 |
| `interactions.repairGrace` | `0.15` | 保留当前修机交互的宽限秒数 |
| `interactions.healGrace` | `0.2` | 多人治疗/救援工作活跃判定宽限秒数 |
| `interactions.hatchRange` | `58` | 开启地窖的交互距离，像素；倒地也可立即逃生 |

## lockers

| 字段 | 当前值 / 类型 | 含义与单位 |
| --- | --- | --- |
| `lockers.searchSeconds` | `1.2` | 屠夫搜索衣柜秒数 |
| `lockers.enterSeconds` | `0.45` | 幸存者进出衣柜读条秒数 |
| `lockers.exitCooldown` | `0.65` | 幸存者进出衣柜后的冷却秒数 |
| `lockers.grabSeconds` | `0.8` | 从衣柜抓出幸存者的过渡秒数 |
| `lockers.grabCooldown` | `1` | 抓出幸存者后的屠夫冷却秒数 |
| `lockers.emptyCooldown` | `0.5` | 搜空衣柜后的屠夫冷却秒数 |
| `lockers.doorOffset` | `36` | 柜门交互点相对柜子中心的向下偏移，像素 |
| `lockers.halfWidth` | `17` | 衣柜碰撞宽度的一半，像素 |
| `lockers.halfHeight` | `13` | 衣柜碰撞高度的一半，像素 |

## skill

| 字段 | 当前值 / 类型 | 含义与单位 |
| --- | --- | --- |
| `skill.firstDelay` | `7` | 第一次校准的基础等待秒数 |
| `skill.warningSeconds` | `0.65` | 校准出现前警告的提前秒数 |
| `skill.startMin` | `0.48` | 成功区域起点的最小进度，0～1 |
| `skill.startRandom` | `0.22` | 成功区域起点额外随机范围，0～1 |
| `skill.width` | `0.18` | 校准成功区域宽度，0～1 |
| `skill.intervalMin` | `5` | 两次校准的最短间隔，秒 |
| `skill.intervalRandom` | `7` | 校准间隔的额外随机秒数 |
| `skill.hookPenalty` | `6` | 挣扎校准失败增加的挂钩时间，秒 |
| `skill.repairLoss` | `0.08` | 修机校准失败损失进度，0～1 |
| `skill.healLoss` | `0.15` | 治疗校准失败损失共享进度，0～1 |
| `skill.failureCooldown` | `1.2` | 校准失败后的角色冷却秒数 |
| `skill.cancelDelay` | `4` | 工作取消后重设的校准等待秒数 |
| `skill.sweepSeconds` | `0.95` | 校准指针走完整条的秒数 |

## alerts

| 字段 | 当前值 / 类型 | 含义与单位 |
| --- | --- | --- |
| `alerts.generatorSeconds` | `8` | 发电机完成或校准失败位置警报持续秒数 |
| `alerts.rescueSeconds` | `8` | 救援发生位置警报持续秒数 |
| `alerts.healInterruptSeconds` | `8` | 移动打断治疗位置警报持续秒数 |
| `alerts.lockerSeconds` | `12` | 衣柜乌鸦位置警报持续秒数 |
| `alerts.kickSeconds` | `5` | 踢机/踩板方向提示持续秒数 |
| `alerts.noiseSeconds` | `5` | AI 可调查的声音痕迹持续秒数 |
| `alerts.scratchSeconds` | `7` | 奔跑划痕保留秒数 |
| `alerts.bloodSeconds` | `14` | 受伤血迹保留秒数 |
| `alerts.traceInterval` | `0.3` | 产生划痕/血迹的最短间隔，秒 |
| `alerts.tauntCooldown` | `0.25` | 两次嘲讽触发的最短间隔，秒 |

## match

| 字段 | 当前值 / 类型 | 含义与单位 |
| --- | --- | --- |
| `match.groundGenerators` | `6` | 每局从地面候选点抽取的发电机数量 |
| `match.upstairsGenerators` | `1` | 每局从二楼候选点抽取的发电机数量 |
| `match.requiredGenerators` | `5` | 修好多少台发电机给出口通电 |
| `match.outdoorHooks` | `11` | 每局抽取的地上钩子数量，地下室四钩另计 |
| `match.gateAnimationSeconds` | `1.4` | 出口开启动画秒数，动画结束后可通过 |
| `match.gateExitOffset` | `160` | 出口终点到门中心的横向距离，像素 |
| `match.escapeRadius` | `18` | 进入出口终点的逃脱判定半径，像素 |
| `match.escapeAnimationSeconds` | `0.9` | 成功逃脱后到结束对局的过渡秒数 |
| `match.deathSeconds` | `2.4` | 死亡灵魂动画秒数 |
| `match.chaseRange` | `220` | 判断追逐的距离，像素 |
| `match.chaseAttackGrace` | `2` | 最近发动攻击也能维持追逐的时间窗口，秒 |
| `match.chaseMemory` | `3` | 追逐目标离开后保留状态的秒数 |
| `match.floorDistancePenalty` | `450` | 不同楼层目标在普通距离计算中增加的代价，像素 |
| `match.floorSoundDistance` | `80` | 不同楼层在恐惧/音效距离计算中的垂直距离，像素 |
| `match.chaseAimWeight` | `80` | 选择追逐目标时朝向偏差的权重，越大越偏好正前方 |
| `match.chaseSwitchMargin` | `45` | 保留原追逐对象的评分宽限，越大越不易切换 |

## lunge

| 字段 | 当前值 / 类型 | 含义与单位 |
| --- | --- | --- |
| `lunge.windup` | `0.035` | 突刺开始移动前的起手秒数 |
| `lunge.contact` | `0.065` | 突刺开始允许命中判定的秒数 |
| `lunge.end` | `0.24` | 突刺移动及伤害判定结束时刻，距攻击开始的秒数 |
| `lunge.distance` | `22.4` | 突刺过程中屠夫额外移动的距离，像素 |
| `lunge.recovery` | `0.65` | 突刺画面回到待机的总秒数 |

## camera

| 字段 | 当前值 / 类型 | 含义与单位 |
| --- | --- | --- |
| `camera.survivor` | `对象` | 求生者镜头参数 |
| `camera.survivor.fov` | `60` | 求生者镜头视角，度；变大会缩小画面物件、看得更广 |
| `camera.survivor.z` | `0.8` | 求生者虚拟镜头高度，越大视野越广 |
| `camera.killer` | `对象` | 屠夫镜头参数 |
| `camera.killer.fov` | `45` | 屠夫镜头视角，度；变大会缩小画面物件、看得更广 |
| `camera.killer.z` | `0.8` | 屠夫虚拟镜头高度，越大视野越广 |
| `camera.mobileKillerZoom` | `0.75` | 手机屠夫额外缩放倍率，越小看得越广 |
| `camera.fit` | `对象` | 不同屏幕的适配参数 |
| `camera.fit.mobileMin` | `0.8` | 手机自适应缩放的最小值 |
| `camera.fit.mobileMax` | `1.6` | 手机自适应缩放的最大值 |
| `camera.fit.mobileWidth` | `430` | 手机缩放基准宽度，屏幕像素 |
| `camera.fit.mobileHeight` | `300` | 手机缩放基准高度，屏幕像素 |
| `camera.fit.desktopMin` | `1.25` | 桌面自适应缩放的最小值 |
| `camera.fit.desktopMax` | `2.25` | 桌面自适应缩放的最大值 |
| `camera.fit.desktopWidth` | `640` | 桌面缩放基准宽度，屏幕像素 |
| `camera.fit.desktopHeight` | `390` | 桌面缩放基准高度，屏幕像素 |

## audio

| 字段 | 当前值 / 类型 | 含义与单位 |
| --- | --- | --- |
| `audio.defaultVolume` | `0.65` | 初次进入的默认音量，0～1；已有本地设置优先 |
| `audio.tauntRange` | `700` | 嘲讽传播范围，像素 |
| `audio.tauntDurations` | `[1.752,1.824,4.248,10.296,2.424,2.952,2.472]` | 七个嘲讽音频的时长数组，秒，按 TAUNTS 顺序 |
| `audio.heartbeat` | `对象` | 心跳音频曲线参数 |
| `audio.heartbeat.interval` | `1.2` | 无危险时的心跳间隔基值，秒 |
| `audio.heartbeat.intervalDrop` | `0.88` | 满危险时心跳间隔减少的秒数 |
| `audio.heartbeat.gain` | `0.16` | 开始有危险时的心跳音量基值 |
| `audio.heartbeat.gainRise` | `1.22` | 满危险时心跳音量额外增量 |
| `audio.heartbeat.exponent` | `1.6` | 心跳音量随危险值变化的曲线指数 |
| `audio.heartbeat.cutoff` | `260` | 心跳低通滤波基础截止频率，Hz |
| `audio.heartbeat.cutoffRise` | `320` | 满危险时截止频率额外增加值，Hz |
| `audio.chaseVolume` | `0.42` | 追逐音乐音量相对总音量倍率 |
| `audio.workVolume` | `0.58` | 维修/治疗工作循环音量倍率 |
| `audio.runStepSeconds` | `0.31` | 奔跑脚步最短间隔，秒 |
| `audio.walkStepSeconds` | `0.48` | 走路脚步最短间隔，秒 |
| `audio.runStepVolume` | `0.34` | 奔跑脚步音量倍率 |
| `audio.walkStepVolume` | `0.18` | 走路脚步音量倍率 |

## stairsVisual

| 字段 | 当前值 / 类型 | 含义与单位 |
| --- | --- | --- |
| `stairsVisual.width` | `46` | 楼梯画面宽度，像素 |
| `stairsVisual.length` | `66` | 楼梯画面长度，像素 |
| `stairsVisual.steps` | `7` | 楼梯台阶数，整数且至少 3 |
| `stairsVisual.rise` | `4` | 台阶立面的画面高度，像素 |
| `stairsVisual.bloodColor` | `7607083` | 地下室血迹颜色，十进制 RGB |
| `stairsVisual.upColor` | `11314556` | 上行楼梯台阶颜色，十进制 RGB |
| `stairsVisual.downColor` | `6512466` | 下行楼梯台阶颜色，十进制 RGB |
| `stairsVisual.basementColor` | `4406846` | 地下室楼梯台阶颜色，十进制 RGB |

## layout

| 字段 | 当前值 / 类型 | 含义与单位 |
| --- | --- | --- |
| `layout.attempts` | `3000` | 随机板区生成尝试上限 |
| `layout.palletCount` | `12` | 每局随机板区数，不含固定板子 |
| `layout.verticalChance` | `0.5` | 随机板区纵向布置的概率，0～1 |
| `layout.origin` | `对象` | 随机候选网格起点 |
| `layout.origin.x` | `176` | 横向坐标或相对横向偏移，像素 |
| `layout.origin.y` | `112` | 纵向坐标或相对纵向偏移，像素 |
| `layout.columns` | `48` | 随机候选网格列数 |
| `layout.rows` | `38` | 随机候选网格行数 |
| `layout.cell` | `32` | 候选网格间距，像素 |
| `layout.longLeft` | `120` | 长板区左侧地形的最短长度，像素 |
| `layout.longRandom` | `35` | 长板区左侧额外随机长度，像素 |
| `layout.shortLeft` | `42` | 短板区左侧地形最短长度，像素 |
| `layout.shortRandom` | `20` | 短板区左侧额外随机长度，像素 |
| `layout.longRight` | `75` | 长板区右侧地形长度，像素 |
| `layout.shortRight` | `45` | 短板区右侧地形长度，像素 |
| `layout.halfGap` | `28` | 木板缺口宽度的一半，像素 |
| `layout.thickness` | `26` | 板区地形厚度，像素 |
| `layout.wallClearance` | `34` | 随机板区与其他地形的最小间隔，像素 |
| `layout.objectiveClearance` | `60` | 随机板区与物件/出生点的预留距离，像素 |
| `layout.approachOffset` | `48` | 木板前后预留落脚点偏移，像素 |
| `layout.lowEvery` | `4` | 每 N 个随机板区设置一个高墙板区，其余低墙 |
| `layout.bounds` | `对象` | 随机板区允许的外边界 |
| `layout.bounds.x` | `65` | 横向坐标或相对横向偏移，像素 |
| `layout.bounds.y` | `60` | 纵向坐标或相对纵向偏移，像素 |
| `layout.bounds.right` | `1855` | 允许的最大横坐标，像素 |
| `layout.bounds.bottom` | `1380` | 允许的最大纵坐标，像素 |
| `layout.keepClear` | `数组，5 项` | 禁止生成板区的矩形及额外留白数组 |
| `layout.keepClear[].x` | `760` | 横向坐标或相对横向偏移，像素 |
| `layout.keepClear[].y` | `380` | 纵向坐标或相对纵向偏移，像素 |
| `layout.keepClear[].w` | `400` | 矩形宽度，像素 |
| `layout.keepClear[].h` | `450` | 矩形高度，像素 |
| `layout.keepClear[].pad` | `48` | 矩形四周额外禁止生成板区的留白，像素 |
| `layout.rockClearance` | `64` | 随机板区距石头外框的最小通行留白，像素 |
| `layout.retries` | `12` | 空间拥挤时重新布置随机板区的最多次数，保留板区数最多的方案 |
| `layout.rockLoopEvery` | `4` | 每 N 个随机板区中第 2 个用成对石头夹板，当前每局 3 组 |
| `layout.rockDepth` | `34` | 夹板石头的基础厚度，像素 |
| `layout.rockDepthRandom` | `12` | 夹板石头厚度的额外随机范围，像素 |

## basement

| 字段 | 当前值 / 类型 | 含义与单位 |
| --- | --- | --- |
| `basement.inset` | `32` | 地下室相对所属房屋向内缩进的距离，像素 |
| `basement.wallThickness` | `12` | 地下室四周墙厚，像素 |
| `basement.entranceOffset` | `对象` | 地下室楼梯相对房间左上角的偏移 |
| `basement.entranceOffset.x` | `48` | 横向坐标或相对横向偏移，像素 |
| `basement.entranceOffset.y` | `48` | 纵向坐标或相对纵向偏移，像素 |
| `basement.hookOffsets` | `数组，4 项` | 地下室四个钩子相对房间左上角的坐标，必须四项 |
| `basement.hookOffsets[].x` | `200` | 横向坐标或相对横向偏移，像素 |
| `basement.hookOffsets[].y` | `116` | 纵向坐标或相对纵向偏移，像素 |
| `basement.shackChance` | `0.5` | 地下室刷新在白房的概率，0～1，其余为双层房 |

## world

| 字段 | 当前值 / 类型 | 含义与单位 |
| --- | --- | --- |
| `world.size` | `对象` | 地图总尺寸；修改时需同步边界墙、出口和寻路范围 |
| `world.size.w` | `1920` | 矩形宽度，像素 |
| `world.size.h` | `1440` | 矩形高度，像素 |
| `world.upperFloor` | `对象` | 二楼有效矩形，同时用于二楼碰撞边界 |
| `world.upperFloor.x` | `785` | 横向坐标或相对横向偏移，像素 |
| `world.upperFloor.y` | `405` | 纵向坐标或相对纵向偏移，像素 |
| `world.upperFloor.w` | `350` | 矩形宽度，像素 |
| `world.upperFloor.h` | `400` | 矩形高度，像素 |
| `world.buildings` | `数组，2 项` | 两栋房屋的区域矩形，影响地板和地下室定位 |
| `world.buildings[].name` | `"双层房"` | 房屋显示名称 |
| `world.buildings[].x` | `760` | 横向坐标或相对横向偏移，像素 |
| `world.buildings[].y` | `380` | 纵向坐标或相对纵向偏移，像素 |
| `world.buildings[].w` | `400` | 矩形宽度，像素 |
| `world.buildings[].h` | `450` | 矩形高度，像素 |
| `world.stairs` | `数组，2 项` | 地面和二楼的连接楼梯 |
| `world.stairs[].bottom.x` | `1085` | 横向坐标或相对横向偏移，像素 |
| `world.stairs[].bottom.y` | `593` | 纵向坐标或相对纵向偏移，像素 |
| `world.stairs[].bottom.level` | `0` | 楼层：0=地面/一楼，1=二楼，-1=地下室；省略视为 0 |
| `world.stairs[].top.x` | `1085` | 横向坐标或相对横向偏移，像素 |
| `world.stairs[].top.y` | `593` | 纵向坐标或相对纵向偏移，像素 |
| `world.stairs[].top.level` | `1` | 楼层：0=地面/一楼，1=二楼，-1=地下室；省略视为 0 |
| `world.drops` | `数组，1 项` | 二楼向地面的单向跳落连接 |
| `world.drops[].top.x` | `1085` | 横向坐标或相对横向偏移，像素 |
| `world.drops[].top.y` | `768` | 纵向坐标或相对纵向偏移，像素 |
| `world.drops[].top.level` | `1` | 楼层：0=地面/一楼，1=二楼，-1=地下室；省略视为 0 |
| `world.drops[].bottom.x` | `1085` | 横向坐标或相对横向偏移，像素 |
| `world.drops[].bottom.y` | `874` | 纵向坐标或相对纵向偏移，像素 |
| `world.drops[].bottom.level` | `0` | 楼层：0=地面/一楼，1=二楼，-1=地下室；省略视为 0 |
| `world.walls` | `数组，82 项` | 基础墙、树、杂物和石块碰撞矩形数组 |
| `world.walls[].x` | `645` | 横向坐标或相对横向偏移，像素 |
| `world.walls[].y` | `228` | 纵向坐标或相对纵向偏移，像素 |
| `world.walls[].w` | `25` | 矩形宽度，像素 |
| `world.walls[].h` | `132` | 矩形高度，像素 |
| `world.walls[].kind` | `"wall"` | 碰撞地形类型：wall=墙、tree=树、junk=杂物、rock=石头 |
| `world.walls[].low` | `true` | true 表示低矮地形，不遮挡视线，保留碰撞 |
| `world.walls[].level` | `1` | 楼层：0=地面/一楼，1=二楼，-1=地下室；省略视为 0 |
| `world.rocks` | `数组，3 项` | 不规则石头的矩形；画面与分段碰撞同步使用，四周需保留通路 |
| `world.rocks[].x` | `1780` | 横向坐标或相对横向偏移，像素 |
| `world.rocks[].y` | `1030` | 纵向坐标或相对纵向偏移，像素 |
| `world.rocks[].w` | `70` | 矩形宽度，像素 |
| `world.rocks[].h` | `65` | 矩形高度，像素 |
| `world.genSpots` | `数组，11 项` | 发电机候选点，按楼层分别随机抽取 |
| `world.genSpots[].x` | `490` | 横向坐标或相对横向偏移，像素 |
| `world.genSpots[].y` | `180` | 纵向坐标或相对纵向偏移，像素 |
| `world.genSpots[].level` | `1` | 楼层：0=地面/一楼，1=二楼，-1=地下室；省略视为 0 |
| `world.hookSpots` | `数组，14 项` | 地上钩子候选点，随机抽取 outdoorHooks 个 |
| `world.hookSpots[].x` | `1200` | 横向坐标或相对横向偏移，像素 |
| `world.hookSpots[].y` | `1300` | 纵向坐标或相对纵向偏移，像素 |
| `world.palletSpots` | `数组，10 项` | 固定板子坐标，必须配套两侧地形 |
| `world.palletSpots[].x` | `1640` | 横向坐标或相对横向偏移，像素 |
| `world.palletSpots[].y` | `1180` | 纵向坐标或相对纵向偏移，像素 |
| `world.palletSpots[].axis` | `"x"` | 板子 axis=x 表示沿 x 方向穿过板子、板子长边沿 y；y/省略表示沿 y 穿过。窗户当前使用 x 向翻越 |
| `world.palletSpots[].level` | `1` | 楼层：0=地面/一楼，1=二楼，-1=地下室；省略视为 0 |
| `world.windowSpots` | `数组，4 项` | 固定窗户坐标，应位于墙体缺口 |
| `world.windowSpots[].x` | `658` | 横向坐标或相对横向偏移，像素 |
| `world.windowSpots[].y` | `197` | 纵向坐标或相对纵向偏移，像素 |
| `world.windowSpots[].axis` | `"x"` | 板子 axis=x 表示沿 x 方向穿过板子、板子长边沿 y；y/省略表示沿 y 穿过。窗户当前使用 x 向翻越 |
| `world.lockers` | `数组，7 项` | 衣柜中心坐标，柜门交互点另有向下偏移 |
| `world.lockers[].x` | `1160` | 横向坐标或相对横向偏移，像素 |
| `world.lockers[].y` | `1100` | 纵向坐标或相对纵向偏移，像素 |
| `world.lockers[].level` | `1` | 楼层：0=地面/一楼，1=二楼，-1=地下室；省略视为 0 |
| `world.survivorStarts` | `数组，4 项` | 四名求生者的出生候选位置，随机分配 |
| `world.survivorStarts[].x` | `1690` | 横向坐标或相对横向偏移，像素 |
| `world.survivorStarts[].y` | `1130` | 纵向坐标或相对纵向偏移，像素 |
| `world.killerStart` | `对象` | 屠夫出生位置 |
| `world.killerStart.x` | `970` | 横向坐标或相对横向偏移，像素 |
| `world.killerStart.y` | `880` | 纵向坐标或相对纵向偏移，像素 |
| `world.gates` | `数组，2 项` | 两个出口门的中心坐标，数组顺序为左、右 |
| `world.gates[].x` | `1908` | 横向坐标或相对横向偏移，像素 |
| `world.gates[].y` | `710` | 纵向坐标或相对纵向偏移，像素 |
| `world.hatch` | `对象` | 逃生地窖的坐标，与地下室不是同一物件 |
| `world.hatch.x` | `950` | 横向坐标或相对横向偏移，像素 |
| `world.hatch.y` | `980` | 纵向坐标或相对纵向偏移，像素 |
| `world.interiorWalls` | `数组，7 项` | 新增室内隔墙、家具碰撞矩形数组 |
| `world.interiorWalls[].x` | `935` | 横向坐标或相对横向偏移，像素 |
| `world.interiorWalls[].y` | `565` | 纵向坐标或相对纵向偏移，像素 |
| `world.interiorWalls[].w` | `25` | 矩形宽度，像素 |
| `world.interiorWalls[].h` | `33` | 矩形高度，像素 |
| `world.interiorWalls[].kind` | `"wall"` | 碰撞地形类型：wall=墙、tree=树、junk=杂物、rock=石头 |
| `world.interiorWalls[].level` | `1` | 楼层：0=地面/一楼，1=二楼，-1=地下室；省略视为 0 |
| `world.interiorWindows` | `数组，1 项` | 新增室内窗坐标 |
| `world.interiorWindows[].x` | `948` | 横向坐标或相对横向偏移，像素 |
| `world.interiorWindows[].y` | `535` | 纵向坐标或相对纵向偏移，像素 |
| `world.interiorWindows[].axis` | `"x"` | 板子 axis=x 表示沿 x 方向穿过板子、板子长边沿 y；y/省略表示沿 y 穿过。窗户当前使用 x 向翻越 |
| `world.interiorWindows[].level` | `1` | 楼层：0=地面/一楼，1=二楼，-1=地下室；省略视为 0 |
| `world.interiorPallets` | `数组，1 项` | 新增室内板子坐标 |
| `world.interiorPallets[].x` | `973` | 横向坐标或相对横向偏移，像素 |
| `world.interiorPallets[].y` | `505` | 纵向坐标或相对纵向偏移，像素 |
| `world.interiorPallets[].axis` | `"y"` | 板子 axis=x 表示沿 x 方向穿过板子、板子长边沿 y；y/省略表示沿 y 穿过。窗户当前使用 x 向翻越 |
| `world.interiorPallets[].level` | `0` | 楼层：0=地面/一楼，1=二楼，-1=地下室；省略视为 0 |

## pathfinding

| 字段 | 当前值 / 类型 | 含义与单位 |
| --- | --- | --- |
| `pathfinding.cell` | `32` | 寻路网格边长，像素 |
| `pathfinding.offset` | `256` | 地图左右额外寻路空间，像素 |
| `pathfinding.maxNodes` | `2200` | 单次寻路最多展开的网格数 |
| `pathfinding.lineStep` | `8` | 直线通行检查的采样间距，像素 |

## ai

| 字段 | 当前值 / 类型 | 含义与单位 |
| --- | --- | --- |
| `ai.pathSeconds` | `1` | 路径缓存基础秒数 |
| `ai.pathRandom` | `0.6` | 路径缓存额外随机秒数 |
| `ai.pathArrival` | `12` | 视为走到路径节点的距离，像素 |
| `ai.stairRange` | `27` | AI 触发楼梯的距离，像素 |
| `ai.windowRange` | `52` | AI 尝试翻窗的距离，像素 |
| `ai.windowAlign` | `27` | AI 翻窗时允许的纵向偏差，像素 |
| `ai.palletRange` | `52` | AI 检测附近板子/尝试放板的距离，像素 |
| `ai.workSafeRange` | `230` | 愿意停下接受治疗的安全距离，像素 |
| `ai.dangerRange` | `240` | 看到屠夫时开始逃跑的距离，像素 |
| `ai.palletThreatRange` | `85` | AI 放板时屠夫离板子足够近的距离，像素 |
| `ai.targetArrival` | `40` | 接近当前逃跑目标到此距离时重选目标，像素 |
| `ai.loopSearchRange` | `320` | 逃跑时搜索板区的范围，像素 |
| `ai.loopOffset` | `38` | 选择板子另一侧逃跑点的偏移，像素 |
| `ai.stairsDangerRange` | `170` | 距离屠夫小于此值时考虑上楼避险，像素 |
| `ai.stairsSearchRange` | `190` | 上楼避险时搜索楼梯的范围，像素 |
| `ai.fleeDirections` | `12` | 逃跑方向采样数量，整数 |
| `ai.fleeDistance` | `260` | 逃跑候选目标的投射距离，像素 |
| `ai.fleeRadius` | `15` | 筛选逃跑落点的碰撞半径，像素 |
| `ai.coverBonus` | `140` | 被地形遮挡的逃跑目标获得的评分奖励 |
| `ai.dropRange` | `35` | AI 跳楼的接近距离，像素 |
| `ai.hatchRange` | `45` | AI 自动进入地窖的距离，像素 |
| `ai.rescueInjuredPenalty` | `160` | 受伤 AI 被选为救援者时的评分惩罚 |
| `ai.rescueRepairPenalty` | `80` | 正在修机的 AI 被选为救援者时的评分惩罚 |
| `ai.rescueSafeRange` | `125` | 屠夫远离挂钩目标时认为适合救援的距离，像素 |
| `ai.rescueUrgentSeconds` | `30` | 被挂超过此秒数后不再等待安全距离 |
| `ai.rescueRange` | `42` | AI 开始救援读条的距离，像素 |
| `ai.downHealBonus` | `1000` | 倒地目标的治疗优先级奖励 |
| `ai.downHealRange` | `700` | 搜索倒地队友的治疗范围，像素 |
| `ai.injuredHealRange` | `160` | 搜索受伤队友的治疗范围，像素 |
| `ai.healRange` | `36` | AI 开始治疗读条的距离，像素 |
| `ai.openGateBonus` | `250` | 选择已打开出口的评分奖励 |
| `ai.gateRange` | `50` | AI 开始开门读条的距离，像素 |
| `ai.generatorDangerRange` | `250` | 发电机靠近屠夫时判为危险的距离，像素 |
| `ai.generatorDangerPenalty` | `500` | 选择危险发电机的评分惩罚 |
| `ai.generatorPeerPenalty` | `130` | 每名正在修机的队友带来的选机评分惩罚 |
| `ai.generatorProgressBonus` | `180` | 已修进度对选机评分的奖励 |
| `ai.repairRange` | `47` | AI 开始维修读条的距离，像素 |
| `ai.hookRange` | `48` | AI 开始挂人读条的距离，像素 |
| `ai.injuredTargetBonus` | `60` | 屠夫选择受伤目标的评分奖励 |
| `ai.downTargetRange` | `70` | 屠夫把倒地者判为近距离目标的距离，像素 |
| `ai.nearDownBonus` | `100` | 屠夫对近距离倒地者的优先级奖励 |
| `ai.farDownPenalty` | `120` | 屠夫对较远倒地者的评分惩罚 |
| `ai.leadSeconds` | `0.22` | 屠夫按目标速度预测未来位置的提前秒数 |
| `ai.sightMemory` | `7` | 屠夫记住最后目击位置的秒数 |
| `ai.pickupRange` | `44` | AI 抱起倒地者的距离，像素 |
| `ai.blockedPalletRange` | `350` | 追逐被倒板阻挡时搜索可破坏板子的范围，像素 |
| `ai.breakRange` | `57` | AI 开始踩板的距离，像素 |
| `ai.lockerMemoryRange` | `75` | 检查衣柜是否接近最后记忆位置的范围，像素 |
| `ai.lockerRetrySeconds` | `8` | 再次搜索同一个衣柜的最短间隔，秒 |
| `ai.traceRange` | `190` | 屠夫调查划痕/血迹的距离，像素 |
| `ai.noiseMemory` | `5` | 屠夫记住声音位置的秒数 |
| `ai.rememberedArrival` | `20` | 到达最后记忆位置的判定距离，像素 |
| `ai.hatchCloseRange` | `60` | AI 关闭地窖的距离，像素 |
| `ai.patrolProgressBonus` | `450` | 屠夫巡逻优先选择有修理进度的发电机的评分奖励 |
| `ai.patrolRetrySeconds` | `18` | 同一个发电机算刚巡逻过的时间窗口，秒 |
| `ai.patrolVisitedPenalty` | `500` | 刚巡逻过的发电机评分惩罚 |
| `ai.patrolCompletedPenalty` | `900` | 已修好发电机的巡逻评分惩罚 |
| `ai.patrolRange` | `55` | AI 到达巡逻点/尝试踢机的距离，像素 |
| `ai.bodyTargetExclusion` | `35` | 目标附近的角色不再加入绕路障碍的距离，像素 |
| `ai.retargetDistance` | `65` | 目标移动超过此距离后重新寻路，像素 |
| `ai.stuckDistance` | `0.1` | 单次移动不足此距离视为卡住并重新寻路，像素 |
| `ai.pathGoalTolerance` | `35` | 寻路终点可接受的误差，像素 |
| `ai.fleeBounds` | `对象` | 逃跑目标坐标限制 |
| `ai.fleeBounds.left` | `65` | 允许的最小横坐标，像素 |
| `ai.fleeBounds.top` | `65` | 允许的最小纵坐标，像素 |
| `ai.fleeBounds.right` | `1850` | 允许的最大横坐标，像素 |
| `ai.fleeBounds.bottom` | `1370` | 允许的最大纵坐标，像素 |
| `ai.fallback` | `对象` | 没有可用逃跑候选点时的备用坐标 |
| `ai.fallback.x` | `950` | 横向坐标或相对横向偏移，像素 |
| `ai.fallback.y` | `900` | 纵向坐标或相对纵向偏移，像素 |

## touch

| 字段 | 当前值 / 类型 | 含义与单位 |
| --- | --- | --- |
| `touch.stickRadiusRatio` | `0.32` | 摇杆有效半径占控件宽度的比例 |
| `touch.deadZone` | `8` | 移动摇杆死区，屏幕像素 |
| `touch.runThreshold` | `0.7` | 推杆距离占有效半径达到此比例后奔跑 |
| `touch.attackAimDeadZone` | `14` | 拖动攻击键开始改变朝向的最小距离，屏幕像素 |

## physics

| 字段 | 当前值 / 类型 | 含义与单位 |
| --- | --- | --- |
| `physics.gateHalfWidth` | `8` | 出口门碰撞宽度的一半，像素 |
| `physics.gateHalfHeight` | `54` | 出口门碰撞高度的一半，像素 |
| `physics.gateBarrierHalfHeight` | `64` | 屠夫出口屏障判定半高度，像素 |
| `physics.barrierAlertSeconds` | `0.6` | 屏障重复提示的最短间隔，秒 |
| `physics.palletHalfLength` | `23` | 放倒木板长边的一半，像素 |
| `physics.palletHalfThickness` | `10` | 放倒木板短边的一半，像素 |
| `physics.windowHalfWidth` | `9` | 窗户阻挡碰撞的半宽，像素 |
| `physics.windowHalfHeight` | `23` | 窗户阻挡碰撞的半高，像素 |
| `physics.carryOffsetY` | `14` | 被搬运者相对屠夫向上的坐标偏移，像素 |
| `physics.hookOffsetY` | `16` | 被挂者相对钩子中心向下的坐标偏移，像素 |
| `physics.hookBodyOffsetX` | `11` | 挂钩姿势相对角色中心横向偏移，像素 |
| `physics.hookBodyOffsetY` | `-26` | 挂钩姿势相对角色中心纵向偏移，像素；负值向上 |

## hud

| 字段 | 当前值 / 类型 | 含义与单位 |
| --- | --- | --- |
| `hud.mobileToastTop` | `56` | 手机消息提示距离屏幕顶部的像素数 |
| `hud.mobileDirectionsTop` | `88` | 手机方向/队友提示距离顶部的像素数 |
| `hud.mobileRepairTop` | `132` | 手机修机进度框距离顶部的像素数 |

## rendering

| 字段 | 当前值 / 类型 | 含义与单位 |
| --- | --- | --- |
| `rendering.density` | `1.5` | 画布最低采样倍率，1.5 表示每个 CSS 像素使用 1.5 个画布像素 |
| `rendering.maxDensity` | `2` | 高分屏画布采样倍率上限，控制显存与填充开销 |
| `rendering.mobileDensity` | `1` | 手机画布采样倍率，1 表示按屏幕 CSS 像素渲染，降低 GPU 开销 |

## killerVisual

| 字段 | 当前值 / 类型 | 含义与单位 |
| --- | --- | --- |
| `killerVisual.bodyScale` | `1.3` | 屠夫初版造型的体型倍率，1 为原大小；以脚底为锚点放大，攻击范围与碰撞仍由 core 和 movement 配置 |

## darkwoodVision

| 字段 | 当前值 / 类型 | 含义与单位 |
| --- | --- | --- |
| `darkwoodVision.outsideAlpha` | `0.88` | 视野外环境压暗程度，0～1 |
| `darkwoodVision.rays` | `96` | 视野轮廓基础射线数量；地形角点会补充射线 |
| `darkwoodVision.refreshSeconds` | `0` | 视野遮罩最短刷新间隔，秒；默认 0 随每帧显示位置更新，避免移动时阶梯跳动，静止时复用 |
| `darkwoodVision.rockMinSize` | `80` | 大石头遮挡视线的最小短边尺寸，世界像素；短边小于此值的小石头不遮挡，碰撞不变 |

## network

| 字段 | 当前值 / 类型 | 含义与单位 |
| --- | --- | --- |
| `network.predictionLimit` | `0.5` | 本机移动预测最多保留的未确认秒数 |
| `network.correctionSeconds` | `0.09` | 服务器位置纠偏的平滑时间常数，秒 |
| `network.snapDistance` | `72` | 纠偏超过此距离直接对齐服务器，像素 |
| `network.inputTimeout` | `1` | 网络断流时停止本机预测的秒数 |
| `network.keyframeEvery` | `10` | 每 N 个 UDP 快照发送一次可靠关键帧 |
| `network.extrapolationSeconds` | `0.1` | 远端快照断续时最多外推秒数，超过后停在末端 |
| `network.movementBurstSeconds` | `0.25` | 房主允许客户端移动积攒的最大时间预算，秒 |
| `network.movementStartSeconds` | `0.15` | 首次客户端移动上报的初始时间预算，秒 |
