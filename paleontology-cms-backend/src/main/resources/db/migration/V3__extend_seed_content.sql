-- 扩展种子：党建各栏目示例 + 学会侧栏目补充内容

-- 栏目副标题
UPDATE paleo_cms_channel SET subtitle = '新时代党建引领学术腾飞，发挥战斗堡垒作用' WHERE channel_code = 'party';
UPDATE paleo_cms_channel SET subtitle = '发布上级党组织重要批示、巡视巡察及党务正式通知' WHERE channel_code = 'party_announcement';
UPDATE paleo_cms_channel SET subtitle = '展示学会完整党群组织体系及各下设机构职能与架构' WHERE channel_code = 'party_organizations';
UPDATE paleo_cms_channel SET subtitle = '党委政治引领、纪委监督职责及党风廉政建设统筹' WHERE channel_code = 'party_committees';
UPDATE paleo_cms_channel SET subtitle = '年度工作要点、阶段任务部署与专项整治行动' WHERE channel_code = 'party_work';
UPDATE paleo_cms_channel SET subtitle = '三会一课、主题党日、民主生活会等组织生活纪实' WHERE channel_code = 'party_activities';
UPDATE paleo_cms_channel SET subtitle = '党员发展、教育、管理、服务与党费管理规范' WHERE channel_code = 'party_team';
UPDATE paleo_cms_channel SET subtitle = '权威学习数据库、党内法规与基础党务知识' WHERE channel_code = 'party_theory';
UPDATE paleo_cms_channel SET subtitle = '常态化报道各支部党建活动与实践动态' WHERE channel_code = 'party_dynamics';
UPDATE paleo_cms_channel SET subtitle = '阶段性主题党建成果集中展示' WHERE channel_code = 'party_topics';
UPDATE paleo_cms_channel SET subtitle = '优秀党员科学家事迹与党建荣誉' WHERE channel_code = 'party_exemplars';
UPDATE paleo_cms_channel SET subtitle = '监督举报渠道与举报须知' WHERE channel_code = 'party_reporting';
UPDATE paleo_cms_channel SET subtitle = '标准化党务模板与资料下载' WHERE channel_code = 'party_downloads';
UPDATE paleo_cms_channel SET subtitle = '自1929年创立以来，学会见证了近一个世纪中国地球科学的崛起' WHERE channel_code = 'history';
UPDATE paleo_cms_channel SET subtitle = '记录中国古生物学百年足迹与科学精神传承' WHERE channel_code = 'gallery';

-- 党群机构富文本页
INSERT INTO paleo_cms_entry (module_code, column_code, scope, title, body_content, status, sort_order, publish_time, create_by) VALUES
('pages', 'party_organizations', 'party', '党群机构',
 '<p>学会党群组织体系包括党群工作处、党支部委员会、工会委员会、共青团委员会，在学会党委领导下各司其职、协调配合。</p><p>党群工作处负责党建日常统筹；各支部落实组织生活；工会、团委服务会员与青年科技工作者。</p>',
 'PUBLISHED', 0, NOW(), 'admin');

-- 规章条例
INSERT INTO paleo_cms_entry (module_code, column_code, scope, title, body_content, status, sort_order, publish_time, create_by) VALUES
('pages', 'society_charter', 'society', '学会章程',
 '<p>本章程于2018年11月经第十二次全国会员代表大会表决通过。学会是由中国古生物学工作者自愿组成的全国性、学术性、非营利性社会组织。</p><h4>第一章 总则</h4><p>学会的宗旨是团结全国古生物学工作者，促进学科繁荣与科学普及……</p>',
 'PUBLISHED', 1, NOW(), 'admin'),
('pages', 'fossil_protection_regulation', 'society', '古生物化石保护条例',
 '<p>为了加强对古生物化石的保护，促进古生物化石的科学研究与合理利用，国务院制定本条例。</p><p>对化石发掘、收藏、出境、入境等活动进行了详细规范。</p>',
 'PUBLISHED', 2, NOW(), 'admin');

-- 党建文章（各子栏目）
INSERT INTO paleo_cms_entry (module_code, column_code, scope, title, category, summary, body_content, status, pinned, sort_order, publish_time, create_by) VALUES
('party', 'party_committees', 'party', '党委2026年度履职工作要点', '党委履职',
 '明确政治引领、重大事项前置把关与意识形态工作责任。',
 '<p>坚持把政治建设摆在首位，对「三重一大」事项进行前置审议，指导期刊、网站舆论阵地建设。</p>',
 'PUBLISHED', '1', 1, '2026-06-01', 'admin'),
('party', 'party_committees', 'party', '纪委监督执纪工作通报（2026年第一季度）', '纪委监督',
 '畅通监督渠道，开展作风纪律监督检查。',
 '<p>受理信访举报，开展问题线索核查，保持清正廉洁学术作风。</p>',
 'PUBLISHED', '0', 2, '2026-04-15', 'admin'),
('party', 'party_work', 'party', '中国古生物学会2026年党建工作要点', '年度要点',
 '聚焦思想政治引领、组织规范化建设、科学家精神弘扬三大任务。',
 '<p>开展「不忘初心，科技报国」主题学习；实施青年学者成长护航计划；开展党纪学习教育。</p>',
 'PUBLISHED', '1', 1, '2026-01-10', 'admin'),
('party', 'party_work', 'party', '科研经费合规使用专项整治部署', '专项整治',
 '配合财务部门对近三年科研项目经费进行抽查审计。',
 '<p>坚决杜绝微腐败，精简党务会议与表格填报。</p>',
 'PUBLISHED', '0', 2, '2026-03-20', 'admin'),
('party', 'party_activities', 'party', '2026年第一季度「三会一课」开展情况', '三会一课',
 '各支部组织生活开展情况通报。',
 '<p>会议集中学习了关于高水平科技自立自强的重要论述，结合学科发展开展专题讨论。</p>',
 'PUBLISHED', '0', 1, '2026-04-30', 'admin'),
('party', 'party_activities', 'party', '「传承红色基因，探索生命起源」主题党日活动', '主题党日',
 '赴南京地质古生物研究所陈列馆参观学习。',
 '<p>党员们参观了老一辈科学家手稿陈列，领会科学家精神。</p>',
 'PUBLISHED', '0', 2, '2026-05-12', 'admin'),
('party', 'party_team', 'party', '2026年党员发展计划公示', '发展党员',
 '拟发展预备党员5名，接受群众监督。',
 '<p>按照发展党员工作细则，经支部推荐、党委预审，现予以公示。</p>',
 'PUBLISHED', '0', 1, '2026-05-01', 'admin'),
('party', 'party_team', 'party', '党费收缴与使用管理情况通报', '党费管理',
 '2025年度党费收缴账目公示。',
 '<p>各支部按时足额缴纳党费，使用规范透明。</p>',
 'PUBLISHED', '0', 2, '2026-02-28', 'admin'),
('party', 'party_theory', 'party', '《中国共产党纪律处分条例》专题学习资料', '党内法规',
 '2023年修订版全文及解读。',
 '<p>规范党组织和党员行为的重要纪律法规，是管党治党的重要利器。</p>',
 'PUBLISHED', '1', 1, '2026-05-15', 'admin'),
('party', 'party_theory', 'party', '「三会一课」制度问答', '基础党务',
 '组织生活制度常见问题解答。',
 '<p>定期召开支部党员大会、支部委员会、党小组会，按时上好党课。</p>',
 'PUBLISHED', '0', 2, '2026-04-01', 'admin'),
('party', 'party_exemplars', 'party', '李四光院士：地质之光', '科学家精神',
 '中国现代地质学与古生物学奠基人，科研报国典范。',
 '<p>著名科学家、教育家，创立地质力学，为中国石油工业发展做出跨时代贡献。</p>',
 'PUBLISHED', '1', 1, '2026-05-01', 'admin'),
('party', 'party_exemplars', 'party', '「优秀共产党员」刘杰研究员先进事迹', '荣誉表彰',
 '2025年度学会优秀共产党员。',
 '<p>创新「党建+科普」模式，深入偏远山区开展科普志愿服务。</p>',
 'PUBLISHED', '0', 2, '2025-07-01', 'admin'),
('party', 'party_reporting', 'party', '违法违纪举报须知', '举报须知',
 '举报人应遵守法律法规，提倡实名举报，内容应详实准确。',
 '<ol><li>举报人应当遵守国家法律法规，反映问题要客观真实，不得捏造事实、诬告陷害他人。</li><li>提倡实名举报，我们将严格保密。</li><li>举报内容应尽量详实，包括时间、地点、具体情节及证据。</li></ol>',
 'PUBLISHED', '1', 1, NOW(), 'admin');

-- 党建专题
INSERT INTO paleo_cms_entry (module_code, column_code, scope, title, category, summary, body_content, status, sort_order, publish_time, create_by) VALUES
('party', 'party_topic', 'party', '党纪学习教育专题', '2026年4月 - 2026年7月',
 '组织党员认真学习《中国共产党纪律处分条例》，做到学纪、知纪、明纪、守纪。',
 '<ul><li>《条例》专题学习与逐条解读</li><li>党委书记讲纪律专题党课</li><li>违纪违法典型案例警示教育</li></ul>',
 'PUBLISHED', 1, '2026-04-01', 'admin');

-- 历史相册
INSERT INTO paleo_cms_entry (module_code, scope, title, category, cover_url, status, sort_order, publish_time, create_by) VALUES
('gallery', 'society', '1950年代野外考察', '早期风采',
 'https://lh3.googleusercontent.com/aida-public/AB6AXuB-5UFr7wRFX7bCPr3VibXOHMw3e8uUVrVmPFzOCBdoRlyL3NPNHbAJIVZSj4y-MeIkd4GUV0XaYScTAMWf_iehw2NL0qB3tkVYY6M-BMrIQDb6FjmNxGDjPoDIg65rYIGEyaoluRwfAF0Y8BR6IZRReFnJbM8aUWlq1gbA3W2A0snXBXXdzOfZh3Re1XjXgTY5HVg0PmrDvUYPBY0hlR1FrqiAX7yIKslZLte1jow11NpNYMfMDohzZf9BgT6cwHqUDRf0DcdG303Z',
 'PUBLISHED', 1, NOW(), 'admin'),
('gallery', 'society', '国际古生物学大会合影', '国际交流',
 'https://lh3.googleusercontent.com/aida-public/AB6AXuDEvYlo35Mb6q9OEif5aa6iUiP_oq9priQhtcpe-0yjuaIob_LuMN0Qk_l-TGY8-vJxDv_JPbtsodY4OMnqv0GM3mpkoO_sw9xrFv8cEYcFcs3j2HI20DqGKdvyUWajysaqIpyQ4EoO7V5NZrCLude6NvtkKHx-9bZTZfsj2QCuo7cQ3_CcV2uTZVLvN2uDbwMaUEd0-3G9cmM-amGpmFxDrkYsPf1woZ7tEO3cXVENfjl3yY5jfnSHA7R7t6LBj6DqNqQ0tW-RrXzH',
 'PUBLISHED', 2, NOW(), 'admin');

-- 国际交流
INSERT INTO paleo_cms_entry (module_code, column_code, scope, title, category, summary, body_content, status, sort_order, publish_time, create_by) VALUES
('international', 'news', 'society', '中日两国古生物学会签署合作备忘录', '国际合作',
 '双方将在化石保护、人才培养及学术出版等领域开展深度合作。',
 '<p>中国古生物学会与日本古生物学会代表在南京正式签署学术合作备忘录。</p>',
 'PUBLISHED', 1, '2024-05-12', 'admin'),
('international', 'report', 'society', '第四届国际古生物学大会总结报告', '重要报告',
 '来自全球50多个国家的逾千名专家参加，发布多项重磅研究成果。',
 '<p>会议期间发布了关于白垩纪生物大灭绝的多项研究成果。</p>',
 'PUBLISHED', 2, '2024-03-20', 'admin');

-- 党建下载
INSERT INTO paleo_cms_entry (module_code, scope, title, category, summary, file_url, status, sort_order, publish_time, create_by, extra_json) VALUES
('downloads', 'party', '入党申请书标准格式与撰写指引', '发展党员常用模板', 'party-application.doc',
 '/downloads/party-application.doc', 'PUBLISHED', 1, NOW(), 'admin', '{"fileName":"party-application.doc","scope":"party"}'),
('downloads', 'party', '思想汇报撰写要求及参考范文', '发展党员常用模板', 'thought-report.docx',
 '/downloads/thought-report.docx', 'PUBLISHED', 2, NOW(), 'admin', '{"fileName":"thought-report.docx","scope":"party"}'),
('downloads', 'party', '党支部「三会一课」会议记录样表', '党务管理工作表单', 'meeting-record.docx',
 '/downloads/meeting-record.docx', 'PUBLISHED', 3, NOW(), 'admin', '{"fileName":"meeting-record.docx","scope":"party"}');

-- 人员信息 extra_json 补全
UPDATE paleo_cms_entry SET
  category = '名誉理事长',
  summary = '现任领导',
  extra_json = '{"name":"戎嘉余","group":"现任领导","bio":"中国科学院院士，古生物学家。"}'
WHERE module_code = 'personnel' AND title = '戎嘉余';

UPDATE paleo_cms_entry SET
  category = '理事长',
  summary = '现任领导',
  extra_json = '{"name":"朱敏","group":"现任领导","bio":"中国科学院古脊椎动物与古人类研究所研究员。"}'
WHERE module_code = 'personnel' AND title = '朱敏';

-- 学会简介正文扩充
UPDATE paleo_cms_entry SET body_content =
 '<p>中国古生物学会由地质学及古生物界前辈丁文江、葛利普、孙云铸等学者于1929年8月在北京正式成立。作为中国最早建立的跨学科自然科学社团之一，学会始终承载着推动中国地层古生物学研究与人才培养的使命。</p><p>在将近一个世纪的历程中，学会见证了中国「恐龙之乡」的发现，更在澄江生物群、热河生物群以及早期人类进化研究中扮演了不可替代的协调与推动角色。</p>'
WHERE module_code = 'pages' AND column_code = 'intro_overview';

-- 沿革节点补充摘要
UPDATE paleo_cms_entry SET summary = '学会正式成立于北平', body_content = '<p>首任会长孙云铸教授确立了「研究地层古生物学，促进地质科学发展」的宗旨。</p>'
WHERE module_code = 'timeline' AND title = '1929';

UPDATE paleo_cms_entry SET summary = '学术活动恢复', body_content = '<p>纳入中国科学技术协会体系，学术交流步入正轨。</p>'
WHERE module_code = 'timeline' AND title = '1950';
