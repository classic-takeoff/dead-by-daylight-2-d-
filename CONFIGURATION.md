# 修改游戏数值

统一入口：[src/game-config.json](src/game-config.json)。游戏模拟、画面和操作提示直接读取这份文件；它不是单独导出的数值清单。

**完整逐字段说明：[CONFIG-FIELDS.md](CONFIG-FIELDS.md)**，包含所有配置分区、嵌套字段和地图数组的结构。修改 JSON 后运行 `node scripts/config-fields.mjs` 可更新文档中的当前值，并检查是否有未说明的新增字段。

时间单位是秒，位置/距离是世界像素，速度是像素/秒，概率和进度是 0～1，角度是弧度。JSON 不支持注释，分区说明放在文件内的 `_字段说明`。

## 修改后如何生效

1. 修改 JSON，保存。使用 `npm run dev` 时 Vite 会重载相关模块；刷新页面并开新局，确保地图和对局参数全部采用新值。
2. 用 `npm test` 检查，再用 `npm run build` 生成 `dist`。
3. GameHub 需要上传新的 `dist` 压缩包。修改本地 JSON 不会自动改变已经发布的版本。
4. 联机玩家应使用同一个发布版本，避免不同地图或规则导致同步差异。

例如，将 `core.killerSpeed` 从 `122` 改成 `128`，屠夫基础移速就变为 128；将 `core.repairTime` 从 `48` 改成 `60`，单人修机基础时间变为 60 秒。

## 常改参数

| JSON 路径 | 当前含义 |
| --- | --- |
| `core.survivorSpeed` / `core.killerSpeed` | 求生者跑速 / 屠夫基础速度 |
| `movement.walkSpeed` / `movement.crawlSpeed` / `movement.carrySpeed` | 走路 / 倒地爬行 / 屠夫搬运速度 |
| `movement.boostMultiplier` / `movement.boostSeconds` | 受伤加速倍率 / 时长 |
| `core.repairTime` / `core.healTime` / `core.rescueTime` | 修机 / 治疗 / 救援耗时 |
| `core.hookPhase` / `core.bleedTime` | 每次挂钩阶段 / 倒地失血时长 |
| `core.gateTime` / `core.endgameTime` | 开门耗时 / 终局倒计时 |
| `match.requiredGenerators` | 通电所需修好的发电机数，界面提示同步变化 |
| `match.groundGenerators` / `match.upstairsGenerators` | 地面 / 二楼发电机数量，不能超过候选坐标数 |
| `match.outdoorHooks` | 地上钩子数，地下室仍固定四钩 |
| `core.attackRange` / `core.lungeRange` / `core.attackHalfAngle` | 普攻距离 / 蓄力攻击距离 / 攻击半角 |
| `core.maxChargeTime` / `actions.lungeThreshold` | 满蓄力耗时 / 触发突刺的蓄力比例 |
| `actions.hitRecovery` / `actions.missRecovery` / `actions.chargeRecovery` | 命中 / 空刀恢复，加上蓄力带来的额外恢复 |
| `actions.breakPalletSeconds` / `actions.kickSeconds` | 踩板 / 踢机耗时 |
| `actions.stunSeconds` / `actions.stunRadius` | 板子眩晕时间 / 作用距离 |
| `actions.selfRescueChance` | 自救概率，例如 `0.04` 是 4% |
| `actions.recoverCap` / `actions.recoverSeconds` | 自我恢复上限 / 完整恢复所需时间 |
| `actions.healPerHelperMultiplier` | 每名治疗者贡献的治疗速度倍率；默认 1，两人同步治疗为两倍速度 |
| `skill.repairLoss` / `skill.healLoss` | 校准失败的修机 / 治疗进度损失 |
| `alerts.generatorSeconds` | 修机完成或失败时屠夫收到的位置提示时长 |
| `interactions.hatchRange` | 开启的地窖交互距离，健康、受伤、倒地都立即逃生 |
| `traversal.*Seconds` / `traversal.*Range` | 上下楼、跳落、快慢翻的耗时及交互范围 |
| `camera.mobileKillerZoom` | 手机屠夫额外缩放，越小看得越广；当前 `0.75` |
| `camera.survivor` / `camera.killer` | 各角色镜头角度和高度 |
| `hud.mobileToastTop` / `hud.mobileDirectionsTop` | 手机消息 / 方向提示距顶部的像素数 |
| `touch.deadZone` / `touch.runThreshold` | 移动摇杆死区 / 推远奔跑阈值 |
| `touch.attackAimDeadZone` | 攻击键拖动多远开始调整朝向 |
| `audio.defaultVolume` | 初次进入的默认音量；已有玩家的本地音量设置优先 |
| `audio.tauntRange` / `audio.chaseVolume` | 嘲讽传播范围 / 追逐音乐音量 |

## 地图和室内博弈

`world.walls` 是基础碰撞地形，`world.interiorWalls` 是新增室内家具和隔墙；`world.interiorWindows` 和 `world.interiorPallets` 分别定义室内窗与板。两套数组会自动合并，供渲染、碰撞、寻路和交互共同使用。

`level` 的含义：`0` 为地面/一楼，`1` 为二楼，`-1` 为地下室。不填写时默认为 0。墙体的 `x,y` 是左上角，`w,h` 是尺寸；物件和楼梯的 `x,y` 是中心点。

`low: true` 表示低矮遮挡，蹲下可以利用它藏身。板子应保留两侧配套地形及可通行的前后落点。窗户应放在墙体缺口中，并在两侧留下翻越落点。更改建筑位置或尺寸时，相关墙体、楼板、楼梯、物件坐标需要成组调整。

`layout` 控制随机长短板区的数量、长度、间隔、候选网格及保留通道。`basement.shackChance` 是地下室刷新在白房的概率，剩余概率刷新在双层房；`basement.hookOffsets` 必须保留四个坐标。

`stairsVisual` 调整台阶尺寸和色彩。上下方向根据楼梯目的楼层自动计算；带地下室端点的楼梯自动带血迹，地面入口始终显示下行。

## 其他分区

`ai` 是追逐、绕板、救援、治疗和巡逻的距离阈值与权重；`physics` 是角色搬运、板窗和出口的物理尺寸；`pathfinding` 是寻路网格和搜索上限。不要把算法中的数学常数、网络协议格式或装饰像素当成游戏平衡参数修改。

启动时会检查关键耗时、概率、发电机数量和地下室钩子数。地图修改仍需实际检查通路。自动测试包含多种种子的通路检查，以及在独立目录里修改 JSON 后加载游戏、验证移动/修机/通电/楼梯参数真正改变的测试。
