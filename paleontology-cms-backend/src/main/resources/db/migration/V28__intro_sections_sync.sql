-- 学会简介子栏目：发展规划页面种子

INSERT INTO paleo_cms_entry (module_code, column_code, scope, title, category, summary, body_content, status, pinned, sort_order, publish_time, create_by)
SELECT 'pages', 'intro_planning', 'society', '发展规划', '学会简介', NULL,
 '<p>中国古生物学会中长期发展规划将围绕学科前沿、人才队伍、科学传播与国际合作等方面持续推进。具体内容请在管理后台「学会简介 → 发展规划」中维护。</p>',
 'PUBLISHED', '0', 4, NOW(), 'admin'
WHERE NOT EXISTS (
  SELECT 1 FROM paleo_cms_entry
  WHERE module_code = 'pages' AND column_code = 'intro_planning' AND deleted = '0'
);

UPDATE paleo_cms_channel
SET subtitle = '学会概况、章程、领导机构、专业分会与发展规划',
    update_by = 'admin'
WHERE channel_code = 'intro' AND deleted = '0';
