-- 学会服务子栏目：作为可增删改的 Tab 配置（非固定编码）
-- 子栏目挂在 services 下，visible=1 供前台读取，show_in_admin=0 不在侧栏单独展示

UPDATE paleo_cms_channel SET
  visible = '1',
  show_in_admin = '0',
  admin_section = NULL,
  subtitle = '科普文章、视频、基地、专著与化石保护',
  layout_params = '{"servicesTab":true,"websiteTabKey":"science"}',
  content_module = 'science',
  sort_order = 1,
  status = 'PUBLISHED',
  update_by = 'admin'
WHERE channel_code = 'admin_services_science' AND deleted = '0';

UPDATE paleo_cms_channel SET
  visible = '1',
  show_in_admin = '0',
  admin_section = NULL,
  subtitle = '交流动态、国际会议、重要报告与合作机构',
  layout_params = '{"servicesTab":true,"websiteTabKey":"international"}',
  content_module = 'international',
  sort_order = 2,
  status = 'PUBLISHED',
  update_by = 'admin'
WHERE channel_code = 'admin_services_intl' AND deleted = '0';

UPDATE paleo_cms_channel SET
  visible = '1',
  show_in_admin = '0',
  admin_section = NULL,
  subtitle = '奖项介绍与申报指南',
  layout_params = '{"servicesTab":true,"websiteTabKey":"awards"}',
  content_module = 'tech-rewards',
  sort_order = 3,
  status = 'PUBLISHED',
  update_by = 'admin'
WHERE channel_code = 'admin_services_tech' AND deleted = '0';
