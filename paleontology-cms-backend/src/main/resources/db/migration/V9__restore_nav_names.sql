-- 恢复前台导航名称：V6 误将 nav_name 改为后台用途名称
UPDATE paleo_cms_channel SET nav_name = '学会简介' WHERE channel_code = 'intro' AND deleted = '0';
UPDATE paleo_cms_channel SET nav_name = '组织机构' WHERE channel_code = 'structure' AND deleted = '0';
