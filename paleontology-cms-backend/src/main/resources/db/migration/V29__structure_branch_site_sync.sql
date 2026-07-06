-- 组织机构重构：总学会组织机构页 + 分会子站配置同步

UPDATE paleo_cms_channel
SET subtitle = '中国古生物学会及 11 个专业分会；左侧选择分会，右侧查看组织机构与管理系列',
    layout_type = 'custom',
    content_module = 'pages',
    page_type = 'CUSTOM',
    update_by = 'admin'
WHERE channel_code = 'structure' AND deleted = '0';

-- 组织机构 / 管理系列 富文本页面（字段与 V28 intro_planning 种子保持一致）
INSERT INTO paleo_cms_entry (module_code, column_code, scope, title, category, summary, body_content, status, pinned, sort_order, publish_time, create_by)
SELECT 'pages', 'structure_org_chart', 'society', '组织机构', '组织机构', NULL,
       '<p>中国古生物学会组织机构图。请在管理后台「组织机构 → 组织机构 / 管理系列」中维护正文内容。</p>',
       'PUBLISHED', '0', 1, NOW(), 'admin'
WHERE NOT EXISTS (
    SELECT 1 FROM paleo_cms_entry
    WHERE module_code = 'pages' AND column_code = 'structure_org_chart' AND deleted = '0'
);

INSERT INTO paleo_cms_entry (module_code, column_code, scope, title, category, summary, body_content, status, pinned, sort_order, publish_time, create_by)
SELECT 'pages', 'structure_management', 'society', '管理系列', '组织机构', NULL,
       '<p>学会管理系列说明。请在管理后台维护。</p>',
       'PUBLISHED', '0', 2, NOW(), 'admin'
WHERE NOT EXISTS (
    SELECT 1 FROM paleo_cms_entry
    WHERE module_code = 'pages' AND column_code = 'structure_management' AND deleted = '0'
);

-- 隐藏旧「专业分会」独立频道（若存在；已并入组织机构）
UPDATE paleo_cms_channel
SET visible = '0', update_by = 'admin'
WHERE channel_code = 'branches' AND deleted = '0';

-- 分会子站管理菜单说明
UPDATE paleo_cms_channel
SET subtitle = '维护分会子站：概况、工作动态、科学传播、下载中心等（与前台 /structure/branch 同步）',
    update_by = 'admin'
WHERE channel_code = 'admin_structure_branch' AND deleted = '0';

UPDATE paleo_cms_channel
SET nav_name = '组织机构',
    subtitle = '维护总学会组织机构图、管理系列及人员信息',
    update_by = 'admin'
WHERE channel_code = 'structure' AND deleted = '0';
