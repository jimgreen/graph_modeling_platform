# 交流容器 — 合并后跟进清单(final review 2026-09-16 定稿)

实现与评审记录见 `.superpowers/sdd/2026-09-15-ac-container/`(本地台账,未入 git)。

## mcheck 遗留(2026-09-17 合并前一站式审查)

**合并前建议处理(1 项):**
- **antd 静态 `Modal.confirm` 收口**(Standards 轴 Important):容器删除确认(`appSelectionDragFactories.tsx` 约 :1711)与「添加到容器」表单弹窗(约 :1877)用 antd 静态方法,不继承 `main.tsx` ConfigProvider 主题(dev 下有 antd 告警),且与仓库既有 `showGlobalConfirm` 确认体系分裂。改法:删除确认→`showGlobalConfirm`;表单→受控对话框组件或 `App.useApp().modal`;并同步改测试桩。

**性能 followup(mcheck Efficiency 轴):**
- **H1**:加载路径的容器存量回填(`rebuildContainerExempt*`,appProjectCanvasFactories.tsx 约 :2931/:2936)未走 LOD 门控(>320 节点模型本应延迟),大模型首屏同步跑 K 次布线设计;可并入既有 deferred 修复调度(注意保存/导出前必须已回填)。
- **H2**:拖角 resize 每 pointermove 全表 filter + 成员包围盒算两遍;成员集合/minSize 可在拖动开始缓存一次。
- **L1/L5/L7**:模型路由豁免过滤逐候选重复、getEExportWarnings plan 双算、`isAcContainerKind` 用 includes —— 收益小,压测后再动。

**层次 followup(mcheck Altitude 轴):**
- **switch 子串启发式根因收口**:`baseKind.includes("switch")` 类判据散落(model.ts:1076/:1088 等已加容器豁免),应收成 `isSwitchingLikeKind` 谓词(中风险,逐条比对后再合)。
- **「几何为用户所有」两套口径**:definitionInstanceSync 容器内判 vs 加载路径母线内联;可收 `isUserOwnedGeometryKind`(动母线前须全面核实副作用)。
- **staticShapeText 复用**:DeviceGlyph 容器分支手写文本定位,可复用 `staticShapeText`(三处默认值差异需显式注入;视觉风险,跑快照)。
- **几何复用(可选)**:`containerBoundsForMembers` ≡ `calculateModelGeometryBounds(members, [], padding)`(padding 加性;引入新耦合,须跑几何断言 + golden)。

## 后续任务建议(按优先级)

0. **冒烟项(优先)**:拖一条**带折点/已布线连线**的设备进容器松手——确认折点随弹出位置走(同步边调整层以 finalDelta 为基准,推测由位置驱动的 route repair 兜住,静态分析未确证)。
   **已采纳(2026-09-16 二次裁决)**:统一「排斥」到非拖动入口(粘贴/放置/导入/布局)——提交出口 `commitContainerMembership` + 布局一处各传 `repelNonMembers: true`。
   「显式落点=意图」分叉作废;排斥只对**已有**容器生效:目标容器同在本批 movedIds(整组粘贴 / SVG 导入整模型重建)按落点入组,否则导入图容器恒空。

1. ~~**旋转/变换路径接入 enforce**~~ — **已落地(2026-09-16 裁决「现在修」)**:`createFinishTransformDrag` 三提交分支接入 `refitContainersAfterTransform`(半程只重算几何、不挤出;容器自身跳过);**遗留**:变换**拖动过程中**容器不实时跟随(仅提交时重算),要跟手再补。
2. ~~**布局路径与拖动路径口径统一**~~ — **已落地(2026-09-16 二次裁决)**:对齐/分布选中容器 = 容器+全部成员整组参与
   (`mergeContainerLayoutUnits`);自动对齐/散开 = 两阶段(先容器内 `arrangeContainerInteriors`,再容器整体参与)。
   见 `docs/superpowers/specs/2026-09-15-ac-container-design.md` 的「布局里的容器语义」。
   **遗留**:线路成员「整组」口径分叉(拖动 `containerDragGroup` 含线路/布局不含;布局后容器被 fit 拉长到原线路处)——触发需显式 Alt 拖线入容器或面板改归属,罕见。
3. ~~**E 文件容器表成员列 — 与下游确认**~~ — **已落地(2026-09-17)**:成员关系统一由独立段 **`ACContainerDev`**(设备引用/容器 idx/容器类型三列;原 `container_dev`,同轮更名)承载,容器表保持 5 列不加成员列;该段为**功能表,不受模板过滤恒输出**。`container_idx` 值域经两轮调整:轮 13 口径「模板态 `表名_idx`」→ **轮 18 裁决改为一律容器行裸 idx**(两态同形,不加前缀)。
4. **多选批量行排除键** — 单节点模型面板已剔除 `is_gateway`/`bound_device_idx` 两键(`fd5384dc`;原 `type` 键随 2026-09-16 `type→dev_type` 变更消失,`dev_type` 行保留显示元件英文名);多选批量编辑行(appCanvasInteractionFactories.tsx 约 :2631 白名单)未排除,多选容器时仍可出现。
5. **`audit:names` 扩「解构遮蔽模块 import」扫描** — 本轮该类缺陷(Task 8 Critical)靠新工厂测试兜住;静态作用域分析作为独立工具任务。
6. **e2e 容器用例** — 现有 e2e 无容器场景;长期防护可立。

## 已知边界(spec 已对齐,不是缺陷)

- 线路避让豁免的存量回填:打开老模型/导出 SVG 时「端点连容器内设备」的连线与**绘制线路设备**(ac-routable-line 等)均按新规则重算;**曾手工调整过折点的此类路径会被覆盖**(盘上数据无法区分手工折点与自动快照;只改内存、保存落盘)。
- 画布上容器低于成员但**高于线路层**(线路在节点层之下,平台既有结构);导出 SVG 容器在 segment 层之前(线路之下)——两面层级相反,如实机观感不认可再改画布分层。
- `static-line` 及非线路静态图元:不进容器成员,落入容器范围会被挤出(静态豁免只覆盖挤出侧;判定侧静态图元不自动入组,显式右键/面板入口仍可用)。
- Alt 拖设备落入容器矩形:归属不写(符合 Alt 语义),随即被挤出(符合"范围内不允许非成员")。
- 容器命名:右键新建得「虚拟电厂N」,图元库放置得「虚拟电厂-N」(平台对所有 kind 的既有行为,容器未特殊化)。
- 存量悬空 `containerId`:面板下拉点一次「无容器」自愈;judge/eject 已把悬空视为无归属。
- ~~模板态(国网/主网/配网/台区)下容器段静默不导出(决策 6,后续可补模板定义)~~ —— **已被 2026-09-17 轮 17 裁决取代**:容器表与成员表同规,**功能表恒输出**;模板未定义/类门控关掉容器段时以兜底名输出(实时库族 `dms_def_container`,其余 `container`),列走 `E_SECTION_COLUMNS` 兜底五列;关口拓扑变换连带恢复(所有态生效)。实机反馈:加载模板后窗口/文件里没有容器表,`container_dev.container_idx` 指向不存在的表。
- 删除容器确认框只覆盖 4 个 UI 手势;剪切不弹确认(剪贴板可恢复,日志带散出数);control 端点不弹框(无人可问);删图层沿用图层自带确认。
- 成员关系表 `ACContainerDev`「恒输出」的验证面:仅以 sgcc.e / dms_rtdb.e 两真实模板 + 合成选项跑过(其余预定义模板未逐跑;列定义兜底与剔除豁免同为一行代码,风险低)。

## 轮 17 审查遗留(rev-fb19,2026-09-17;均为 Minor/Observation,不阻塞)

- **类级「是否导出」开关对容器类名不副实**:容器表升为功能表恒输出后,元件定义对话框里取消勾选 ACContainer 只改表名/列口径(走兜底名+五列),不停止输出。可把该行语义改成「随模板」或加悬浮提示(UI 文案改动,待用户定)。
- **模板定义容器段但字段列表为空 → 引用悬空**:容器记录被列空守卫剔除,设备表 `container_id` 仍写 `模板表名_idx`(文件里却无该表)。**修复前即如此,非本轮引入**;若要收口,在 finalizeContainerCrossRefs 兜底分支加「目标表无最终落位」判据。(成员表 `container_idx` 轮 18 起写裸 idx,此边界下为构建期裸 idx 兜底,不再悬空带表名。)

## 台账内 deferred 家族(全部经 final review 分诊:无阻断项)

悬空 containerId 家族 / 挤出算法近似(单轮让位、重叠容器) / E 段序窄配置例外 / 关口文案精度 / 静态豁免连通面 / 镜像组顺序与撤销快照知情项 / 报告计数瑕疵 —— 明细见台账 `progress.md`。
