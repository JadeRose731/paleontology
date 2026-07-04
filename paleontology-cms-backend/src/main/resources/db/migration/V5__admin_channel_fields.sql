-- 管理后台频道化：侧栏菜单与内容编辑区段
ALTER TABLE paleo_cms_channel
    ADD COLUMN show_in_admin CHAR(1)      DEFAULT '1' COMMENT '管理后台侧栏显示 0/1' AFTER visible,
    ADD COLUMN admin_section VARCHAR(64)  DEFAULT NULL COMMENT '管理后台内容区段 banners/news/pages...' AFTER show_in_admin,
    ADD COLUMN nav_icon VARCHAR(64)       DEFAULT NULL COMMENT '侧栏图标标识' AFTER admin_section,
    ADD COLUMN admin_roles VARCHAR(256)   DEFAULT NULL COMMENT '允许访问角色JSON数组' AFTER nav_icon;

-- 为现有频道填充 admin_section 与图标
UPDATE paleo_cms_channel SET admin_section = 'banners',     nav_icon = 'LayoutDashboard', admin_roles = '["super_admin"]' WHERE channel_code = 'home' AND deleted = '0';
UPDATE paleo_cms_channel SET admin_section = 'pages',       nav_icon = 'FileText',       admin_roles = '["super_admin"]' WHERE channel_code = 'intro' AND deleted = '0';
UPDATE paleo_cms_channel SET admin_section = 'personnel',   nav_icon = 'Building2',      admin_roles = '["super_admin"]' WHERE channel_code = 'structure' AND deleted = '0';
UPDATE paleo_cms_channel SET admin_section = NULL,         nav_icon = 'Handshake',      admin_roles = '["super_admin"]', show_in_admin = '1' WHERE channel_code = 'services' AND deleted = '0';
UPDATE paleo_cms_channel SET admin_section = 'party',        nav_icon = 'Flag',           admin_roles = '["super_admin"]' WHERE channel_code = 'party' AND deleted = '0';
UPDATE paleo_cms_channel SET admin_section = 'timeline',    nav_icon = 'Clock',          admin_roles = '["super_admin"]' WHERE channel_code = 'history' AND deleted = '0';
UPDATE paleo_cms_channel SET admin_section = 'gallery',     nav_icon = 'Images',         admin_roles = '["super_admin","branch_admin"]' WHERE channel_code = 'gallery' AND deleted = '0';
UPDATE paleo_cms_channel SET admin_section = 'announcements', nav_icon = 'Megaphone',   admin_roles = '["super_admin","branch_admin"]' WHERE channel_code = 'announcements' AND deleted = '0';
UPDATE paleo_cms_channel SET admin_section = 'publish',     nav_icon = 'Newspaper',      admin_roles = '["super_admin"]' WHERE channel_code = 'news_publish' AND deleted = '0';
UPDATE paleo_cms_channel SET admin_section = 'international', nav_icon = 'Globe',       admin_roles = '["super_admin"]' WHERE channel_code = 'international' AND deleted = '0';
UPDATE paleo_cms_channel SET admin_section = 'downloads',   nav_icon = 'Download',      admin_roles = '["super_admin","branch_admin"]' WHERE channel_code = 'downloads' AND deleted = '0';
UPDATE paleo_cms_channel SET admin_section = 'regulations',   nav_icon = 'BookOpen',      admin_roles = '["super_admin"]' WHERE channel_code = 'regulations' AND deleted = '0';
UPDATE paleo_cms_channel SET admin_section = 'public-files', nav_icon = 'FolderUp',      admin_roles = '["super_admin","branch_admin"]' WHERE channel_code = 'public_files' AND deleted = '0';

-- 党建子栏目：按 column_code 映射 admin_section（party 模块统一入口）
UPDATE paleo_cms_channel SET show_in_admin = '0' WHERE channel_code LIKE 'party_%' AND deleted = '0';
