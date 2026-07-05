-- 将「国际交流」管理入口并入「学会服务」分组（与科学传播、科技奖励并列）
-- 前台 /international 独立页保留不变，仅调整管理后台侧栏结构

INSERT INTO paleo_cms_channel (channel_code, parent_id, route_path, nav_name, sort_order, visible, show_in_admin, admin_section, nav_icon, content_module, page_type, shell_type, status, locked, admin_roles) VALUES
('admin_services_intl', (SELECT channel_id FROM (SELECT channel_id FROM paleo_cms_channel WHERE channel_code='services' AND deleted='0') t), NULL, '国际交流', 3, '0', '1', 'international', 'Globe', 'international', 'CMS', 'standard', 'PUBLISHED', '0', '["super_admin"]');

-- 根级 international 频道仍服务前台 /international，但不再单独出现在管理侧栏
UPDATE paleo_cms_channel
SET show_in_admin = '0',
    admin_section = NULL,
    update_by = 'admin'
WHERE channel_code = 'international' AND deleted = '0';
