-- 科学传播 + 科技奖励 种子数据
-- 供前台 /services?tab=science 与 /services?tab=awards 展示

-- 科学传播（column_code = format：article | video | base | book | fossil）
INSERT INTO paleo_cms_entry (module_code, column_code, scope, title, category, summary, body_content, link_url, status, sort_order, publish_time, create_by, extra_json) VALUES
('science', 'article', 'society', '化石保护：公众如何参与', '科普文章',
 '介绍化石保护法规与公众参与途径。',
 '<p>化石是不可再生的自然资源。公众可通过举报违法发掘、参与科普志愿活动、支持博物馆建设等方式，共同守护地质遗产。</p><p>《古生物化石保护条例》明确了化石发掘、收藏与出境的规范，鼓励社会力量参与监督与宣传。</p>',
 '', 'PUBLISHED', 1, '2026-04-10', 'admin', '{"format":"article","branchId":null}'),

('science', 'base', 'society', '南京汤山地质博物馆科普基地', '科普基地',
 '学会共建科普教育基地介绍。',
 '<p>基地位于南京市汤山，依托丰富的地质遗迹与化石资源，面向中小学生及公众开展地层古生物科普展览与研学活动。</p><p>中国古生物学会与基地共建「化石保护与科学传播」主题展区，定期举办开放日与专家讲解。</p>',
 '', 'PUBLISHED', 2, '2026-03-20', 'admin', '{"format":"base","branchId":null}'),

('science', 'video', 'society', '微体化石鉴定入门（视频）', '科普视频',
 '分会科普视频示例，介绍有孔虫等微体化石的基本鉴定方法。',
 '<p>本视频由微体古生物分会制作，演示显微镜下常见有孔虫壳体特征及地层鉴定要点，适合本科及研究生入门学习。</p>',
 'https://example.com/video', 'PUBLISHED', 3, '2026-05-01', 'admin', '{"format":"video","branchId":"wtxfh"}'),

('science', 'book', 'society', '《Palaeoworld》', '学术期刊',
 '中国古生物学会主办的国际性英文学术期刊，侧重古生物学及地层学前沿研究成果发布。',
 '<p>Palaeoworld 聚焦亚洲及全球古生物地层学重要进展，为国际同行提供高水平学术交流平台。</p>',
 '', 'PUBLISHED', 4, '2026-01-01', 'admin', '{"format":"book","branchId":null}'),

('science', 'book', 'society', '《古生物学报》', '中文核心期刊',
 '创刊于1953年，是我国古生物学领域历史最悠久的综合性学术期刊。',
 '<p>《古生物学报》刊登古生物学、地层学及相关交叉学科研究论文，是中文核心期刊与 CSCD 来源期刊。</p>',
 '', 'PUBLISHED', 5, '2026-01-01', 'admin', '{"format":"book","branchId":null}'),

('science', 'book', 'society', '《化石》科普杂志', '全国优秀科普期刊',
 '面向社会公众的高端科普读物，以生动的语言和精美插图讲述进化故事。',
 '<p>《化石》杂志由中国古生物学会指导，传播地球生命演化知识，多次获评全国优秀科普期刊。</p>',
 '', 'PUBLISHED', 6, '2026-01-01', 'admin', '{"format":"book","branchId":null}'),

('science', 'fossil', 'society', '化石保护与合理利用工作指引', '化石保护',
 '汇总化石产地保护、科研取样与科普展示的相关规范要点。',
 '<p>学会组织专家编制工作指引，指导博物馆、地质公园及科研单位在保护前提下开展化石研究与公众教育。</p><p>强调「保护优先、科研支撑、科普赋能」原则，推动化石资源可持续利用。</p>',
 '', 'PUBLISHED', 7, '2026-02-01', 'admin', '{"format":"fossil","branchId":null}');

-- 科技奖励（column_code = type：intro | guide）
INSERT INTO paleo_cms_entry (module_code, column_code, scope, title, summary, body_content, status, sort_order, publish_time, create_by) VALUES
('tech-rewards', 'intro', 'society', '杰出成就奖', NULL,
 '<p>表彰在古生物学研究、教育或科学传播中做出杰出贡献、具有广泛学术影响的科学家。</p><p>每届评选若干名，由学会学术委员会组织提名与评审。</p>',
 'PUBLISHED', 1, '2026-05-01', 'admin'),

('tech-rewards', 'intro', 'society', '青年古生物学奖', NULL,
 '<p>鼓励45岁以下的青年学者在古生物学及相关领域开展创新研究，激励后备人才成长。</p><p>重点考察原创性成果与发展潜力。</p>',
 'PUBLISHED', 2, '2026-05-01', 'admin'),

('tech-rewards', 'intro', 'society', '优秀论文奖', NULL,
 '<p>表彰在学会主办期刊或年会论文集中发表的优秀学术论文，推动高水平成果传播。</p>',
 'PUBLISHED', 3, '2026-05-01', 'admin'),

('tech-rewards', 'intro', 'society', '科普传播奖', NULL,
 '<p>表彰在科学传播和公众教育中做出突出贡献的个人和团队，弘扬科学家精神。</p>',
 'PUBLISHED', 4, '2026-05-01', 'admin'),

('tech-rewards', 'guide', 'society', '2026年度科学技术奖申报指南', NULL,
 '<p><strong>申报时间：</strong>每年3月至5月为申报期，具体时间以当年通知为准。</p><p><strong>申报方式：</strong>通过学会官网在线申报系统或邮件提交申报材料，需经所在单位推荐。</p><p><strong>评审流程：</strong>初审 → 专家评审 → 学会审议 → 公示 → 颁奖。</p><p><strong>材料要求：</strong>申报表、成果摘要、代表性论文或科普作品清单、单位意见等，详见附件模板。</p>',
 'PUBLISHED', 5, '2026-05-15', 'admin');
