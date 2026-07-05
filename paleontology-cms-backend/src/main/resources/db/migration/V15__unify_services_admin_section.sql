-- 学会服务：后台合并为单一内容管理入口（科学传播 / 国际交流 / 科技奖励 Tab 内切换）
UPDATE paleo_cms_channel
SET admin_section = 'services',
    nav_icon = 'Handshake',
    admin_roles = '["super_admin","branch_admin"]',
    update_by = 'admin'
WHERE channel_code = 'services' AND deleted = '0';

UPDATE paleo_cms_channel
SET show_in_admin = '0',
    update_by = 'admin'
WHERE channel_code IN ('admin_services_science', 'admin_services_tech', 'admin_services_intl') AND deleted = '0';
