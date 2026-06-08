# 需求日志

> 记录所有用户提出的业务需求。每次对话中提及的新增、修改、优化需求均追加到此文件。需求按状态分类，已完成项移到下方。

---

## 待处理需求

### 2026-06-07: 设备维护附件上传

**状态**: 进行中（backend + frontend 主体完成，CSS 补充完成，待测试验证）
**来源**: 用户口述
**优先级**: 中

**描述**: 维护记录支持上传附件（扫描件、PDF、Word、Excel），与照片分开管理：
- DB: `maintenance_records` 增加 `attachments TEXT DEFAULT '[]'` 列
- Backend: 合并 multer 配置，统一处理 photos（图片，6张上限）和 attachments（文档，10个上限）
- Frontend: 维护记录列表显示附件数量，编辑模态框支持附件增删查
- MIME 白名单：image/、application/pdf、.doc/.docx、.xls/.xlsx

**涉及文件**: `backend/src/routes/equipment.js`、`backend/src/db.js`、`frontend/src/views/EquipmentDetail.vue`、`frontend/src/style.css`

### 2026-06-07: 安全配置与运维（部分完成）

**状态**: 待处理
**来源**: 代码审查（外部 AI 反馈）
**优先级**: 中

**描述**:
1. CORS 从全开放改为白名单 ✅（commit `e5a2bb9`）
2. SQLite 数据库自动备份策略 ✅（`POST /api/backup`，commit `e5a2bb9`）
3. 列表查询增加分页 ✅（`parsePagination()` 工具，commit `e5a2bb9`）
4. 补充 `.gitignore`：`test-results/`、`playwright-report/`、`.superpowers/` ❌
5. `status` 字段歧义：`status='completed'` 不应与 `submitted=0` 共存 ❌

### 2026-05-21: D1 技术资料移交清单完善

**状态**: 待处理
**来源**: 用户口述
**优先级**: 中

**描述**: D1 模板（32项）对照越南建筑流程审查：
- 删除越南不存在的条目（建筑物命名审批、民防工程、住宅质保书）
- 新增越南特有文件（IRC/ERC、1/500规划批复、消防设计批准、施工日志）
- 合并建设用地规划许可证+土地使用权 → 土地使用权证
- 拆分消防验收 → 消防设计批准 + 消防验收认证
- 预计从 32 项调整为约 30 项

**涉及文件**: `backend/src/seed.js`

---

## 已完成需求

### 2026-06-07: 操作审计日志

**状态**: 已完成（commit `e5a2bb9`）
**来源**: 代码审查（外部 AI 反馈）
**优先级**: 中

**描述**: 
- 新建 `audit_logs` 表，含 3 个索引（action、target_type、user_id）
- `auditLog()` 辅助函数，dev 模式错误即抛
- 删除、提交、密码重置等关键操作均已记录

### 2026-06-07: 数据安全与运维增强

**状态**: 已完成（commit `e5a2bb9`）
**来源**: 代码审查（外部 AI 反馈）
**优先级**: 高

**描述**:
1. 删除照片/附件时清理磁盘文件（fs.unlink + 错误日志）
2. `user_form_items` 编辑/删除检查已提交的查验记录
3. `maintenance_records` 补充 `submitted_at` 时间戳
4. 照片/附件上传 MIME 类型白名单（imageFilter + ALLOWED_ATTACH_MIMES）

### 2026-06-07: 代码质量审查修复（/simplify）

**状态**: 已完成（commit `e5a2bb9`）
**来源**: /simplify 自动审查
**优先级**: 高

**描述**:
- `fs.copyFileSync` → async `fs.promises.copyFile`
- `audit_logs` 表 3 个索引
- `forms.js` 去冗余子查询 + 统一 null 处理
- `fs.unlink` 错误日志
- 提取 `parsePagination()` 和 `imageFilter` 共享工具
- 合并重复 `PRAGMA table_info` 调用为 `hasColumn()` 缓存
