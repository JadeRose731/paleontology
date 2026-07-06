-- 国际交流 / 科学传播：前台统一版式与学会服务 Tab 共用 CMS 数据源
-- /international 顶栏入口；/science 学会服务 Tab 深链（不出现在顶栏）

UPDATE paleo_cms_channel
SET layout_type = 'international',
    content_module = 'international',
    subtitle = '交流动态、国际会议、国际会议组织与国际会议合作机构',
    update_by = 'admin'
WHERE channel_code = 'international' AND deleted = '0';

INSERT INTO paleo_cms_channel (
  channel_code, parent_id, route_path, nav_name, sort_order, visible, show_in_admin,
  title, subtitle, layout_type, content_module, page_type, shell_type, status, locked, update_by
)
SELECT
  'science', 0, '/science', '科学传播', 99, '0', '0',
  '科学传播', '工作动态、期刊服务、科普基地、科普文章、科普视频与化石保护',
  'science', 'science', 'CMS', 'standard', 'PUBLISHED', '0', 'admin'
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM paleo_cms_channel WHERE channel_code = 'science' AND deleted = '0'
);

-- 确保国际交流/科学传播/科技奖励不在管理侧栏重复出现
UPDATE paleo_cms_channel
SET show_in_admin = '0',
    admin_section = NULL,
    update_by = 'admin'
WHERE channel_code IN ('international', 'science')
  AND deleted = '0';
