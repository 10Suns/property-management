# 业务逻辑修正 & 管理员模板管理

**日期:** 2026-05-22

## 一、页面职责划分

| 页面 | 能做的 | 不能做的 |
|------|--------|----------|
| 我的表单 (ProjectDetail) | 建表、编辑检查项、打印空白表、删除 | 信息录入 |
| 参考表单 (ReferenceForms) | 浏览模板、一键创建为我的表单、管理员可新建/编辑模板 | — |
| 检查记录 (RecordList) | **统一录入入口**、新增记录、继续记录 | 列出参考表单 |
| FormEditor (编辑模式) | 增删改检查项、打印空白表 | 信息录入 |
| FormEditor (录入模式) | 选合格/不合格/免检、拍照、写意见 | 修改检查项 |

## 二、数据规则

- 表单 → 记录：一对多（一个表单可检查多个位置）
- 同一位置可多次检查：不拦截重复记录
- 记录快照：创建记录时把 item_name/check_standard 固化到 inspection_results.custom_* 字段
- 复验：新建整条记录，旧记录保留

## 三、改动清单

### 前端

1. **RecordList.vue**
   - 弹窗数据源 `/templates` → `/forms?project_id=`
   - `createRecord()` 不再 POST /forms，直接用已有表单跳转 FormEditor

2. **FormEditor.vue**
   - 移除编辑模式下的「信息录入」按钮
   - 录入模式加视觉标识（页面标题/标签）

3. **ReferenceForms.vue**
   - 管理员可见「新建参考表单」按钮
   - 管理员可见每个模板的「编辑」按钮
   - 新建/编辑弹窗：form_id、title、category、检查项列表

### 后端

4. **records.js**
   - 创建记录时：从 user_form_items 读取 item_name/check_standard，写入 inspection_results.custom_item_name / custom_standard

5. **templates.js**（新增端点）
   - `POST /` — 管理员创建新模板及检查项
   - `PUT /:id` — 管理员编辑模板及检查项
   - 权限：仅 admin 角色可操作
