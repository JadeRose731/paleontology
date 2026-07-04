-- 管理后台分组子项（前台不可见，仅后台侧栏）
INSERT INTO paleo_cms_channel (channel_code, parent_id, route_path, nav_name, sort_order, visible, show_in_admin, admin_section, nav_icon, content_module, page_type, shell_type, status, locked, admin_roles) VALUES
('admin_home_banners', (SELECT channel_id FROM (SELECT channel_id FROM paleo_cms_channel WHERE channel_code='home') t), NULL, '轮播图', 1, '0', '1', 'banners', 'Image', 'banners', 'CMS', 'home', 'PUBLISHED', '0', '["super_admin"]'),
('admin_home_news',    (SELECT channel_id FROM (SELECT channel_id FROM paleo_cms_channel WHERE channel_code='home') t), NULL, '新闻动态', 2, '0', '1', 'news', 'Newspaper', 'news', 'CMS', 'home', 'PUBLISHED', '0', '["super_admin"]');

UPDATE paleo_cms_channel SET admin_section = NULL WHERE channel_code = 'home' AND deleted = '0';

INSERT INTO paleo_cms_channel (channel_code, parent_id, route_path, nav_name, sort_order, visible, show_in_admin, admin_section, nav_icon, content_module, page_type, shell_type, status, locked, admin_roles) VALUES
('admin_intro_awards', (SELECT channel_id FROM (SELECT channel_id FROM paleo_cms_channel WHERE channel_code='intro') t), NULL, '获奖成果', 2, '0', '1', 'awards', 'Award', 'awards', 'CMS', 'standard', 'PUBLISHED', '0', '["super_admin","branch_admin"]');

UPDATE paleo_cms_channel SET admin_section = 'pages', nav_name = '页面内容' WHERE channel_code = 'intro' AND deleted = '0';

INSERT INTO paleo_cms_channel (channel_code, parent_id, route_path, nav_name, sort_order, visible, show_in_admin, admin_section, nav_icon, content_module, page_type, shell_type, status, locked, admin_roles) VALUES
('admin_structure_branch', (SELECT channel_id FROM (SELECT channel_id FROM paleo_cms_channel WHERE channel_code='structure') t), NULL, '分会内容', 2, '0', '1', 'branch', 'Building2', 'branch', 'CMS', 'standard', 'PUBLISHED', '0', '["branch_admin"]');

UPDATE paleo_cms_channel SET nav_name = '人员信息' WHERE channel_code = 'structure' AND deleted = '0';

INSERT INTO paleo_cms_channel (channel_code, parent_id, route_path, nav_name, sort_order, visible, show_in_admin, admin_section, nav_icon, content_module, page_type, shell_type, status, locked, admin_roles) VALUES
('admin_services_science', (SELECT channel_id FROM (SELECT channel_id FROM paleo_cms_channel WHERE channel_code='services') t), NULL, '科学传播', 1, '0', '1', 'science', 'BookOpen', 'science', 'CMS', 'standard', 'PUBLISHED', '0', '["super_admin","branch_admin"]'),
('admin_services_tech',    (SELECT channel_id FROM (SELECT channel_id FROM paleo_cms_channel WHERE channel_code='services') t), NULL, '科技奖励', 2, '0', '1', 'tech-rewards', 'Trophy', 'tech-rewards', 'CMS', 'standard', 'PUBLISHED', '0', '["super_admin"]');

UPDATE paleo_cms_channel SET admin_section = NULL WHERE channel_code = 'services' AND deleted = '0';

-- 无前台频道的后台专属项
INSERT INTO paleo_cms_channel (channel_code, parent_id, route_path, nav_name, sort_order, visible, show_in_admin, admin_section, nav_icon, content_module, page_type, shell_type, status, locked, admin_roles) VALUES
('admin_media',    0, NULL, '媒体库',       90, '0', '1', 'media',    'FolderOpen', 'media',    'CMS', 'standard', 'PUBLISHED', '0', '["super_admin","branch_admin"]'),
('admin_settings', 0, NULL, '站点配置',     91, '0', '1', 'settings', 'Settings',   'settings', 'CMS', 'standard', 'PUBLISHED', '0', '["super_admin"]');
