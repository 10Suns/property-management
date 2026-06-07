# 打印分页算法优化方案

> 目标：解决表单打印时因内容长短不同导致分页不规范的问题，使输出稳定控制在 1-3 页 A4 纸内。

## 一、问题诊断

### 1.1 根本原因（4 项）

| # | 原因 | 影响 |
|---|------|------|
| RC-1 | `estimateRowHeight()` 按**字符个数**判断换行，不区分中文（全角）和拉丁（半角）字符宽度 | 混合文本（如"检查设备运转 Check equipment"）的换行估算偏差大 |
| RC-2 | 页面容量固定（195mm / 225mm），不随实际表头/表尾高度自适应 | 短表头表单浪费空间，长表头表单溢出 |
| RC-3 | 平衡策略仅在"末页 ≤ 2 项 **且** 总数 ≥ 10"时触发 | 覆盖面窄，大量 3-9 项的末页不均衡场景未处理 |
| RC-4 | `.print-page` 的 `overflow: hidden` 静默裁剪溢出内容 | 用户完全无感知，打印出来缺内容 |

### 1.2 当前算法代码（`print-constants.js`）

```javascript
// 当前：固定阈值判断，每个 if 分支只加一次高度
if (stdCn > 25) h += 4    // 中文标准超 25 字 → +4mm
if (stdVi > 38) h += 3    // 越南语标准超 38 字 → +3mm
if (stdCn > 50) h += 4    // 中文标准超 50 字 → 再 +4mm（第二行）
if (stdVi > 76) h += 3    // 越南语标准超 76 字 → 再 +3mm
if (nameCn > 14) h += 3
if (nameVi > 24) h += 3
if (item.problem) h += 5  // 问题描述：固定 +5mm
```

**核心缺陷**：`"abc"` 和 `"甲乙丙"` 都是 3 个字符，但渲染宽度差 2 倍。

---

## 二、方案选型

### 2.1 放弃方案：DOM 测量分页

将内容渲染到隐藏 DOM → `getBoundingClientRect()` 获取精确高度 → 精确分页。

**放弃原因**：
- 隐藏容器（`display:none`）不计算布局，需用 `visibility:hidden + position:absolute` 的离屏容器
- 离屏容器与打印样式的字体/行高/间距必须完全一致，否则测量失真
- 字体加载时序问题：Web Font 未加载完时测量值不准，需 `document.fonts.ready`
- Vue 渲染周期耦合：需 `$nextTick` 后测量，异步流程复杂
- 打印机驱动渲染差异：屏幕测量 ≠ 打印输出，仍有残余误差

### 2.2 采用方案：改进估算算法

保持纯计算的估算方式，但大幅提升精度。

**优势**：零依赖、同步执行、无 DOM 耦合、可单元测试、改动集中在 2 个文件。

---

## 三、核心算法设计

### 3.1 字符宽度感知计算

```
规则：
  CJK 字符（\u4e00-\u9fff 及扩展区）→ 宽度 = 2 单位
  拉丁/越南语/数字/标点             → 宽度 = 1 单位
```

**示例对比**：

| 文本 | 字符数（旧方法） | 宽度单位（新方法） |
|------|------------------|---------------------|
| `"检查电气设备"` | 6 | 12 |
| `"Check equipment"` | 15 | 15 |
| `"检查 Check"` | 7 | 9（4 CJK + 5 Latin + 1 空格） |

### 3.2 列容量与换行计算

基于 A4 宽度 210mm 和各列占比，计算每列每行可容纳的宽度单位：

```
列宽度（CSS colgroup）：
  序号列    4%  → 不参与估算
  项目名称  22% → 46.2mm
  检查标准  40% → 84.0mm
  查验结果  34% → 71.4mm

每列可用宽度（扣除 cell padding 5px×2 侧 ≈ 2.6mm）：
  项目名称列：46.2 - 2.6 = 43.6mm
  检查标准列：84.0 - 2.6 = 81.4mm
  查验结果列：71.4 - 2.6 = 68.8mm
```

**每宽度单位占多少 mm**（由 CSS 字体大小决定）：

| 语言 | CSS 字号 | 单位宽度 | 说明 |
|------|----------|----------|------|
| 中文 | `9pt` = 3.175mm | ≈ 3.2mm | 全角字符 = 2 单位 |
| 越南语 | `7pt` = 2.469mm | ≈ 2.5mm | 半角字符 = 1 单位（含变音符号垂直延伸） |

**每列每行可容纳的宽度单位**：

| 列 | 中文文本容量 | 拉丁文本容量 |
|----|-------------|-------------|
| 项目名称（43.6mm） | 43.6 / 3.2 = **~13.6 → 取 13** | 43.6 / 2.5 = **~17.4 → 取 17** |
| 检查标准（81.4mm） | 81.4 / 3.2 = **~25.4 → 取 25** | 81.4 / 2.5 = **~32.5 → 取 32** |

> 由于估算时使用统一的宽度单位（CJK=2, Latin=1），列容量也换算为宽度单位：
> - 中文为主的列容量 = mm / 3.2 × 2（因为 CJK = 2 单位）
> - 拉丁为主的列容量 = mm / 2.5 × 1（因为 Latin = 1 单位）
>
> **实际简化**：直接用 `mm / 每单位mm` 得到统一的宽度单位容量：
> - 项目名称列容量：`floor(43.6 / 2.8) ≈ 15` 单位（2.8 为折中系数）
> - 检查标准列容量：`floor(81.4 / 2.8) ≈ 29` 单位

### 3.3 行数估算公式

```
行数 = ceil(文本宽度单位 / 列容量)
行高 = 行数 × 单行高度

单行高度：
  中文行（9pt × line-height 1.35）= 4.3mm
  越南语行（7pt × line-height 1.25）= 3.0mm

每行额外开销：
  cell padding（上下各 4px）= 2.1mm
  border（1px solid）= 0.3mm
  → 固定基础高度 ≈ 2.5mm
```

### 3.4 Problem 字段估算改进

当前：`if (item.problem) h += 5` — 不管问题描述多长都加 5mm。

改进：
```
problem 在查验结果列（34%，68.8mm 可用），字体 8.5pt = 2.998mm
行高 = 8.5pt × 1.3 = 3.5mm
每单位 mm = 3.0mm（中文）/ 2.3mm（拉丁）

problem 行数 = ceil(problemWidthUnits / 20)
problem 高度 = max(1, 行数) × 3.5mm + 1mm（margin-top）
```

### 3.5 安全余量

将页面可用容量下调 10mm，作为估算误差的吸收缓冲：

| 页面 | 原始容量 | 新容量（含安全余量） | 说明 |
|------|---------|---------------------|------|
| 第 1 页 | 195mm | **185mm** | 含标题 + 信息表 + 表头 + 签字栏 |
| 第 2-3 页 | 225mm | **215mm** | 含续标题 + 表头 + 签字栏 |

10mm 约等于 1 行中文双语行的高度，足以吸收字符宽度估算的累积偏差。

### 3.6 完整估算函数伪代码

```javascript
function estimateRowHeight(item) {
  if (!item) return 0

  // 1. 计算各字段的"宽度单位"
  nameW     = calcWidthUnits(item.name)        // 项目名称-中文
  nameViW   = calcWidthUnits(item.nameVi)      // 项目名称-越南语
  stdW      = calcWidthUnits(item.standard)    // 检查标准-中文
  stdViW    = calcWidthUnits(item.standardVi)  // 检查标准-越南语
  problemW  = calcWidthUnits(item.problem)     // 问题描述

  // 2. 计算各列所需行数
  nameLines   = max(1, ceil(nameW / 15), ceil(nameViW / 19))
  stdLines    = max(1, ceil(stdW / 29), ceil(stdViW / 38))
  problemLines = ceil(problemW / 22)

  // 3. 汇总高度
  h = 2.5                                        // 基础（padding + border）
  h += nameLines * 4.3 + (nameViW ? 3.0 : 0)    // 项目名称列
  h += stdLines * 4.3 + (stdViW ? 3.0 : 0)      // 检查标准列
  // 注意：name 和 std 在同一行，取 max 而非 sum → 见下方修正

  // 4. 问题描述
  if (problemLines > 0) h += problemLines * 3.5 + 1.0

  return Math.round(h * 10) / 10
}
```

**修正 — 取 max 而非 sum**：

项目名称列和检查标准列是**同一行的不同单元格**，行高由最高的单元格决定。因此：

```javascript
nameCellH = nameLines * 4.3 + (nameViW > 0 ? 3.0 : 0)
stdCellH  = stdLines * 4.3 + (stdViW > 0 ? 3.0 : 0)
contentH  = max(nameCellH, stdCellH)  // 行高取决于较高的单元格
h = 2.5 + contentH + problemH
```

---

## 四、文件变更清单

### 4.1 `frontend/src/utils/print-constants.js`（主要改动）

#### 变更 1：新增字符宽度计算函数

```javascript
/**
 * 计算文本的"宽度单位"
 * CJK 全角字符 = 2 单位，拉丁/半角字符 = 1 单位
 */
function calcWidthUnits(text) {
  if (!text) return 0
  let units = 0
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    units += (code >= 0x4E00 && code <= 0x9FFF) ||
             (code >= 0x3400 && code <= 0x4DBF) ||
             (code >= 0x3000 && code <= 0x303F) ||
             (code >= 0xFF00 && code <= 0xFF60) ||
             (code >= 0x20000 && code <= 0x2A6DF)
             ? 2 : 1
  }
  return units
}
```

**覆盖的 Unicode 区段**：
- `U+4E00–9FFF`：CJK 统一汉字基本区（覆盖 99% 常用中文）
- `U+3400–4DBF`：CJK 扩展 A 区
- `U+3000–303F`：CJK 符号和标点（全角）
- `U+FF00–FF60`：全角 ASCII 变体
- `U+20000–2A6DF`：CJK 扩展 B 区（罕用字，可选）

#### 变更 2：重写 `estimateRowHeight()`

```javascript
function estimateRowHeight(item) {
  if (!item) return 0

  // --- 各字段宽度单位 ---
  const nameW    = calcWidthUnits(item.name)
  const nameViW  = calcWidthUnits(item.nameVi)
  const stdW     = calcWidthUnits(item.standard)
  const stdViW   = calcWidthUnits(item.standardVi)
  const problemW = calcWidthUnits(item.problem)

  // --- 列容量（宽度单位） ---
  // 项目名称列（22%，可用 43.6mm）：中 ~15 / 越 ~19
  // 检查标准列（40%，可用 81.4mm）：中 ~29 / 越 ~38
  // 查验结果列（34%，可用 68.8mm）：中 ~24（problem 用 8.5pt 稍宽）
  const NAME_CAP_CN = 15, NAME_CAP_VI = 19
  const STD_CAP_CN  = 29, STD_CAP_VI  = 38
  const PROB_CAP    = 22

  // --- 行数计算 ---
  const nameCnLines  = Math.ceil(nameW / NAME_CAP_CN) || 0
  const nameViLines  = Math.ceil(nameViW / NAME_CAP_VI) || 0
  const nameLines    = Math.max(1, nameCnLines, nameViLines)
  const nameViExtra  = nameViW > 0 ? 1 : 0  // 越南语独立行

  const stdCnLines   = Math.ceil(stdW / STD_CAP_CN) || 0
  const stdViLines   = Math.ceil(stdViW / STD_CAP_VI) || 0
  const stdLines     = Math.max(1, stdCnLines, stdViLines)
  const stdViExtra   = stdViW > 0 ? 1 : 0

  const probLines    = problemW > 0 ? Math.max(1, Math.ceil(problemW / PROB_CAP)) : 0

  // --- 高度汇总（mm） ---
  const CN_LINE = 4.3   // 9pt × 1.35
  const VI_LINE = 3.0   // 7pt × 1.25
  const BASE    = 2.5   // padding 2.1mm + border 0.3mm

  // 名称单元格高度
  const nameCellH = nameLines * CN_LINE + nameViExtra * VI_LINE
  // 标准单元格高度
  const stdCellH  = stdLines * CN_LINE + stdViExtra * VI_LINE
  // 取较高单元格（同行不同列）
  const contentH  = Math.max(nameCellH, stdCellH)
  // 问题描述（8.5pt × 1.3 = 3.5mm/行 + 1mm margin）
  const problemH  = probLines * 3.5 + (probLines > 0 ? 1.0 : 0)

  return Math.round((BASE + contentH + problemH) * 10) / 10
}
```

#### 变更 3：调整页面容量（安全余量）

```javascript
// 下调 10mm 作为估算误差缓冲
const PAGE1_CAPACITY_MM = 185   // 原 195
const PAGE2_CAPACITY_MM = 215   // 原 225
```

#### 变更 4：增强平衡策略

```javascript
// 旧：末页 ≤ 2 项 且 总数 ≥ 10 → 按数量对半分
// 新：末页 ≤ 3 项 且 总数 ≥ 6  → 按估算高度均衡分配

const lastUsed = pages[2].length > 0 ? 2 : pages[1].length > 0 ? 1 : 0
if (lastUsed > 0 && pages[lastUsed].length <= 3 && arr.length >= 6) {
  const prev = lastUsed - 1
  const allItems = [...pages[prev], ...pages[lastUsed]]
  let hA = 0, hB = 0
  const redistributed = [[], []]
  for (const it of allItems) {
    const h = estimateRowHeight(it)
    if (hA <= hB) {
      redistributed[0].push(it)
      hA += h
    } else {
      redistributed[1].push(it)
      hB += h
    }
  }
  pages[prev] = redistributed[0]
  pages[lastUsed] = redistributed[1]
}
```

**关键改进**：
- 触发条件从 `≤2 项 + ≥10 项` 放宽到 `≤3 项 + ≥6 项`
- 分配方式从"按数量对半"改为"按高度交替"，避免短项全堆在一页

#### 变更 5：新增溢出检测返回值

```javascript
// splitItems() 返回值新增 pageHeights 字段
const pageHeights = [0, 1, 2].map(pi =>
  pages[pi].reduce((sum, it) => sum + estimateRowHeight(it), 0)
)

return { page1: pages[0], page2: pages[1], page3: pages[2], start2, start3, pageHeights }
```

#### 变更 6：导出新常量

```javascript
// 供 PrintPreview.vue 做溢出检测
export const PAGE_HEIGHTS_MM = {
  0: 205,  // 第 1 页数据区实际可用高度（297 - 标题 - 信息表 - 表头 - 签字栏）
  1: 235,  // 第 2 页（297 - 续标题 - 表头 - 签字栏）
  2: 235,  // 第 3 页
}
```

---

### 4.2 `frontend/src/views/PrintPreview.vue`（次要改动）

#### 变更 1：导入新导出

```javascript
// 旧
import { splitItems } from '../utils/print-constants'

// 新
import { splitItems, PAGE_HEIGHTS_MM } from '../utils/print-constants'
```

#### 变更 2：`allDocuments` 增加溢出标记

在 `allDocuments` computed 中，对每个文档检测溢出：

```javascript
const { page1, page2, page3, start2, start3, pageHeights } = splitItems(items)

// 溢出检测：估算高度超过实际可用高度时标记
const overflowPages = []
pageHeights.forEach((h, i) => {
  const maxH = PAGE_HEIGHTS_MM[i]
  if (h > maxH) {
    overflowPages.push({
      page: i + 1,
      estimated: Math.round(h),
      available: maxH,
      overflow: Math.round(h - maxH)
    })
  }
})

docs.push({
  // ...existing fields...
  overflowPages,  // 新增：溢出页面信息
})
```

#### 变更 3：模板中添加溢出警告

在每份文档的 Page 1 之前插入条件警告：

```html
<template v-for="(doc, di) in allDocuments" :key="di">
  <!-- 溢出警告（仅屏幕显示，打印时隐藏） -->
  <div v-if="doc.overflowPages?.length" class="overflow-warning no-print">
    <span class="warning-icon">⚠</span>
    以下页面内容可能超出打印区域：
    <span v-for="(op, oi) in doc.overflowPages" :key="oi">
      第{{ op.page }}页（估算 {{ op.estimated }}mm / 可用 {{ op.available }}mm，
      超出 {{ op.overflow }}mm）
    </span>
  </div>

  <!-- Page 1 -->
  <div class="print-document">
    <!-- ...existing content... -->
  </div>
</template>
```

#### 变更 4：新增警告样式

```css
.overflow-warning {
  width: 210mm;
  margin: 0 auto 8px;
  padding: 8px 14px;
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 4px;
  font-size: 9pt;
  color: #856404;
  line-height: 1.5;
}

.warning-icon {
  font-size: 12pt;
  margin-right: 4px;
  vertical-align: middle;
}
```

---

## 五、风险评估

| 风险 | 等级 | 缓解措施 |
|------|------|----------|
| 字符宽度估算仍有偏差（字体 kerning、越南语变音符号） | 低 | 10mm 安全余量可吸收 ±5% 的累积误差 |
| 平衡策略重分配后前页溢出 | 低 | 重分配后重新校验各页高度，溢出时回退到原始分配 |
| 新阈值在极端长文本下不准（如 200 字的标准描述） | 中 | `Math.ceil` 保证多算不少算；超出时溢出警告兜底 |
| 打印机渲染差异（不同品牌/驱动） | 中 | 安全余量 + 溢出警告双重保险 |

---

## 六、验证计划

### 6.1 单元测试（可选）

为 `estimateRowHeight()` 编写测试用例：

```javascript
// 纯中文短项
estimateRowHeight({ name: '电气', standard: '正常运行' })
// 预期：~7mm（单行双语）

// 中文长标准（换行）
estimateRowHeight({ name: '设备', standard: '检查所有电气设备是否正常运行，包括开关柜、配电箱、变压器等' })
// 预期：~11-12mm（标准列 2 行）

// 越南语长文本
estimateRowHeight({ name: 'Test', nameVi: 'Kiểm tra', standard: 'OK', standardVi: 'Kiểm tra tất cả thiết bị điện có hoạt động bình thường không' })
// 预期：~11mm（越南语标准换行）

// 含问题描述
estimateRowHeight({ name: '设备', standard: '正常', problem: '发现3号配电箱存在漏电现象，需要立即维修处理' })
// 预期：~13-14mm（含问题 2 行）
```

### 6.2 集成验证（必须）

1. 启动前端 dev server
2. 准备 3 类测试表单：
   - **短表单**：5-8 项，每项文字短（< 15 字） → 期望 1 页
   - **中等表单**：12-15 项，混合长短文字 → 期望 2 页，末页不空旷
   - **长表单**：20+ 项，含多个长标准 + 问题描述 → 期望 2-3 页，无裁剪
3. 浏览器打印预览（`Ctrl+P`），逐页检查：
   - 内容是否完整（无裁剪）
   - 末页是否有过少项（≤ 1 项）
   - 签字栏是否在页面底部
4. 检查溢出警告是否在预期场景下出现

### 6.3 回归验证

- 空模板打印（无数据项）：应为 1 页空白表
- 只有 1 个数据项：应为 1 页
- 全部项都有超长文本：应合理分配到 3 页

---

## 七、改动量估算

| 文件 | 新增 | 修改 | 删除 | 复杂度 |
|------|------|------|------|--------|
| `print-constants.js` | ~40 行 | ~15 行 | ~20 行 | 中 |
| `PrintPreview.vue` | ~25 行 | ~5 行 | 0 | 低 |
| **合计** | **~65 行** | **~20 行** | **~20 行** | — |

预计实施时间：**30-45 分钟**
