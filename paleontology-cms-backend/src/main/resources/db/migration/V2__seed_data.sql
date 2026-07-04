-- 种子：栏目导航（与 latest 原型路由对齐）
INSERT INTO paleo_cms_channel (channel_code, parent_id, route_path, nav_name, sort_order, visible, title, subtitle, layout_type, content_module, page_type, shell_type, status, locked) VALUES
('home',           0, '/',                      '首页',       1,  '1', '中国古生物学会', '探索生命的起源与演化', 'hybrid-home', 'banners', 'HYBRID', 'home',     'PUBLISHED', '0'),
('intro',          0, '/intro',                 '学会简介',   2,  '1', '学会简介',       NULL,                 'mixed',       'pages',   'CMS',    'standard', 'PUBLISHED', '0'),
('structure',      0, '/structure',             '组织机构',   3,  '1', '组织机构',       NULL,                 'personnel-cards', 'personnel', 'CMS', 'standard', 'PUBLISHED', '0'),
('services',       0, '/services',              '学会服务',   4,  '1', '学会服务',       NULL,                 NULL,          NULL,      'CUSTOM', 'home',     'PUBLISHED', '1'),
('party',          0, '/party',                 '党建文化',   5,  '1', '党建文化',       NULL,                 'party-hub',   'party',   'CMS',    'party',    'PUBLISHED', '0'),
('history',        0, '/history',               '学会沿革',   6,  '1', '学会沿革',       NULL,                 'timeline',    'timeline','CMS',    'standard', 'PUBLISHED', '0'),
('gallery',        0, '/gallery',               '历史相册',   7,  '1', '历史相册',       NULL,                 'gallery-grid','gallery', 'CMS',    'standard', 'PUBLISHED', '0'),
('announcements',  0, '/society-announcements', '会员公告',   8,  '1', '会员公告',       NULL,                 'list',        'announcements', 'CMS', 'standard', 'PUBLISHED', '0'),
('news_publish',   0, '/news-publish',          '新闻发布',   9,  '1', '新闻发布',       NULL,                 'list-multi-column', 'publish', 'CMS', 'standard', 'PUBLISHED', '0'),
('international',  0, '/international',         '国际交流',   10, '1', '国际交流',       NULL,                 'list',        'international', 'CMS', 'standard', 'PUBLISHED', '0'),
('downloads',      0, '/downloads-center',      '资料下载',   11, '1', '资料下载',       NULL,                 'file-list',   'downloads', 'CUSTOM', 'standard', 'PUBLISHED', '1'),
('regulations',    0, '/regulations',           '规章条例',   12, '1', '规章条例',       NULL,                 'richtext-single', 'regulations', 'CMS', 'standard', 'PUBLISHED', '0'),
('public_files',   0, '/public-downloads',      '公开文件',   13, '1', '公开文件下载',   NULL,                 'file-list',   'public-files', 'CUSTOM', 'standard', 'PUBLISHED', '1');

-- 党建子栏目
INSERT INTO paleo_cms_channel (channel_code, parent_id, route_path, nav_name, sort_order, visible, title, layout_type, content_module, page_type, shell_type, status) VALUES
('party_announcement', (SELECT channel_id FROM (SELECT channel_id FROM paleo_cms_channel WHERE channel_code='party') t), '/announcements',  '通知公告',       1, '1', '通知公告',       'list', 'party', 'CMS', 'party', 'PUBLISHED'),
('party_organizations',(SELECT channel_id FROM (SELECT channel_id FROM paleo_cms_channel WHERE channel_code='party') t), '/organizations','党群机构',       2, '1', '党群机构',       'richtext-single', 'pages', 'CMS', 'party', 'PUBLISHED'),
('party_committees',   (SELECT channel_id FROM (SELECT channel_id FROM paleo_cms_channel WHERE channel_code='party') t), '/committees',     '党委纪委',       3, '1', '党委纪委',       'list', 'party', 'CMS', 'party', 'PUBLISHED'),
('party_work',         (SELECT channel_id FROM (SELECT channel_id FROM paleo_cms_channel WHERE channel_code='party') t), '/work',           '党建工作',       4, '1', '党建工作',       'list', 'party', 'CMS', 'party', 'PUBLISHED'),
('party_activities',   (SELECT channel_id FROM (SELECT channel_id FROM paleo_cms_channel WHERE channel_code='party') t), '/activities',     '组织生活',       5, '1', '组织生活',       'list', 'party', 'CMS', 'party', 'PUBLISHED'),
('party_team',         (SELECT channel_id FROM (SELECT channel_id FROM paleo_cms_channel WHERE channel_code='party') t), '/team-building',  '党员队伍建设',   6, '1', '党员队伍建设',   'list', 'party', 'CMS', 'party', 'PUBLISHED'),
('party_theory',       (SELECT channel_id FROM (SELECT channel_id FROM paleo_cms_channel WHERE channel_code='party') t), '/theory-study',   '理论学习专栏',   7, '1', '理论学习专栏',   'list', 'party', 'CMS', 'party', 'PUBLISHED'),
('party_dynamics',     (SELECT channel_id FROM (SELECT channel_id FROM paleo_cms_channel WHERE channel_code='party') t), '/dynamics',       '工作动态',       8, '1', '工作动态',       'list', 'party', 'CMS', 'party', 'PUBLISHED'),
('party_topics',       (SELECT channel_id FROM (SELECT channel_id FROM paleo_cms_channel WHERE channel_code='party') t), '/special-topics', '党建专题',       9, '1', '党建专题',       'list', 'party', 'CMS', 'party', 'PUBLISHED'),
('party_exemplars',    (SELECT channel_id FROM (SELECT channel_id FROM paleo_cms_channel WHERE channel_code='party') t), '/exemplars',      '先进典型',       10,'1', '先进典型',       'list', 'party', 'CMS', 'party', 'PUBLISHED'),
('party_reporting',    (SELECT channel_id FROM (SELECT channel_id FROM paleo_cms_channel WHERE channel_code='party') t), '/reporting',      '违法违纪举报',   11,'1', '违法违纪举报',   'list', 'party', 'CMS', 'party', 'PUBLISHED'),
('party_downloads',    (SELECT channel_id FROM (SELECT channel_id FROM paleo_cms_channel WHERE channel_code='party') t), '/downloads',      '下载中心',       12,'1', '下载中心',       'file-list', 'downloads', 'CUSTOM', 'party', 'PUBLISHED');

-- 种子：示例内容条目
INSERT INTO paleo_cms_entry (module_code, column_code, scope, title, category, summary, body_content, status, pinned, sort_order, publish_time, create_by) VALUES
('banners', NULL, 'society', '中国古生物学会首页主 Banner', NULL, NULL, NULL, 'PUBLISHED', '0', 1, NOW(), 'admin'),
('news', NULL, 'society', '中国古生物学会天体生物学分会在南京成立', '学会要闻', '分会成立仪式在南京举行，学会领导及多位院士出席。', '<p>中国古生物学会天体生物学分会正式成立……</p>', 'PUBLISHED', '1', 1, '2026-05-20', 'admin'),
('announcements', NULL, 'society', '关于开展2026年度「中国古生物学会科学技术奖」推荐及申报工作的通知', '奖励申报', '学会现启动2026年度科学技术奖推荐工作。', '<p>请各会员单位按要求组织申报……</p>', 'PUBLISHED', '1', 1, '2024-10-25', 'admin'),
('pages', 'intro_overview', 'society', '学会概况', NULL, NULL, '<p>中国古生物学会成立于1929年，是全国性学术团体……</p>', 'PUBLISHED', '0', 0, NOW(), 'admin'),
('pages', 'intro_charter', 'society', '学会章程', NULL, NULL, '<p>第一章 总则……</p>', 'PUBLISHED', '0', 0, NOW(), 'admin'),
('party', 'party_announcement', 'party', '关于认真学习贯彻习近平总书记在两院院士大会上重要讲话精神的通知', '重要批示', '学会党委发布学习贯彻通知。', '<p>请各党支部认真组织学习……</p>', 'PUBLISHED', '1', 1, '2026-05-28', 'admin'),
('party', 'party_dynamics', 'party', '学会党委开展主题党日活动', '党建活动', '赴红色教育基地参观学习。', '<p>活动纪实……</p>', 'PUBLISHED', '0', 1, '2026-05-10', 'admin'),
('timeline', NULL, 'society', '1929', NULL, '学会成立', '中国古生物学会在北京成立。', 'PUBLISHED', '0', 1, NOW(), 'admin'),
('timeline', NULL, 'society', '1950', NULL, '学术活动恢复', '新中国成立后学会恢复学术活动。', 'PUBLISHED', '0', 2, NOW(), 'admin'),
('personnel', NULL, 'society', '戎嘉余', '现任领导', '中国科学院院士，古生物学家。', NULL, 'PUBLISHED', '0', 1, NOW(), 'admin'),
('personnel', NULL, 'society', '朱敏', '现任领导', '中国科学院古脊椎动物与古人类研究所研究员。', NULL, 'PUBLISHED', '0', 2, NOW(), 'admin'),
('settings', 'site_config', 'society', '站点配置', NULL, NULL,
 '{"copyright":"© 2026 中国古生物学会 版权所有","contactPhone":"010-XXXXXXXX","contactEmail":"office@paleo.cn","address":"北京市西城区XXXX号","friendLinks":[{"name":"中国科协","url":"https://www.cast.org.cn"}],"quickLinks":[{"id":"ql-1","label":"会员注册","path":"/services","icon":"person_add","sort":1,"enabled":true}]}',
 'PUBLISHED', '0', 0, NOW(), 'admin');

-- 更新 banner 封面与链接
UPDATE paleo_cms_entry SET cover_url = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDlNRleNYvnVjS703omdnq4SM-S4HAx1xJVPMOPltrMf3netfsxNQud338lNFjAxAV31Qvw_etAUmU7KMW1YX2RKxA0dIotwdignl1jKI4uZFvvhgyNMpO-uro4Ld7zpIKXe2gunUiSareQKqn3BzF2YiR1c6Mo4uJK52AGT3lz9FhR7rC91LMgbBgK9PpmNDIwMww8mYPVHIhMLQCaKNLMN8lTHz0YLT_5l_2At0BlIvczBqmME2kYLxSAm1wZ1q303vtfCEZnWQ4', link_url = '/intro'
WHERE module_code = 'banners' AND title LIKE '%首页主 Banner%';

-- 首页区块示例
INSERT INTO paleo_cms_block (channel_id, block_type, title, body_content, sort_order, visible, status)
SELECT channel_id, 'hero', '首页 Hero', '{"tagline":"ESTABLISHED 1929","ctaPrimary":"/intro","ctaSecondary":"/services"}', 1, '1', 'PUBLISHED'
FROM paleo_cms_channel WHERE channel_code = 'home';

INSERT INTO paleo_cms_block (channel_id, block_type, title, body_content, sort_order, visible, status)
SELECT channel_id, 'quick_links', '快捷入口', NULL, 2, '1', 'PUBLISHED'
FROM paleo_cms_channel WHERE channel_code = 'home';
