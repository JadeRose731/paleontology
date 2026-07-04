-- 学会简介页面三大区块的 CMS 条目
-- 后台「页面内容」管理中可编辑，前台 Intro.tsx 按 column_code 读取

INSERT INTO paleo_cms_entry (module_code, column_code, scope, title, category, summary, body_content, status, pinned, sort_order, publish_time, create_by) VALUES
('pages', 'intro_background', 'society', '学会背景', '学会简介', NULL,
 '<p>中国古生物学会由地质学及古生物界前辈丁文江、葛利普、孙云铸等学者于1929年8月在北京正式成立。作为中国最早建立的跨学科自然科学社团之一，学会始终承载着推动中国地层古生物学研究与人才培养的使命。</p><p>在将近一个世纪的历程中，学会不仅见证了中国"恐龙之乡"的发现，更在澄江生物群、热河生物群以及早期人类进化研究中扮演了不可替代的协调与推动角色。</p>',
 'PUBLISHED', '0', 1, NOW(), 'admin'),

('pages', 'intro_mission', 'society', '学会宗旨与任务', '学会简介', NULL,
 '<div class="grid grid-cols-1 md:grid-cols-4 gap-6"><div class="md:col-span-2 bg-white border border-fossil-stone border-t-2 border-t-tertiary-fixed p-8 shadow-sm rounded"><h3 class="text-xl font-bold mb-4 text-primary">学术交流</h3><p class="text-sm text-slate-600 leading-relaxed">组织国内外学术会议，创办高水平学术期刊，促进学科交叉与前沿探讨。</p></div><div class="md:col-span-2 p-8 border-t-2 border-t-tertiary-fixed shadow-sm rounded text-white" style="background-color:#715a3e"><h3 class="text-xl font-bold mb-4" style="color:#f5e0ba">人才培养</h3><p class="text-sm opacity-90 leading-relaxed">设立"尹赞勋奖"、"青年古生物学奖"，激励中青年学者追求卓越，服务国家重大战略。</p></div><div class="md:col-span-1 bg-slate-100 border border-fossil-stone p-6 shadow-sm rounded"><h4 class="font-bold text-base mb-2 text-primary">科学普及</h4><p class="text-xs text-slate-600 leading-relaxed">推动自然博物馆建设，面向公众开展科普教育活动。</p></div><div class="md:col-span-3 bg-white border border-fossil-stone p-6 shadow-sm rounded"><h4 class="font-bold text-base mb-2 text-primary">学科规范与服务</h4><p class="text-xs text-slate-600 leading-relaxed">制定古生物命名、化石保护国家标准，为相关政府部门提供决策咨询与技术支撑。</p></div></div>',
 'PUBLISHED', '0', 2, NOW(), 'admin'),

('pages', 'intro_contribution', 'society', '学科发展贡献', '学会简介', NULL,
 '<div class="space-y-8"><div class="flex gap-6"><div class="w-12 h-12 bg-slate-100 flex items-center justify-center rounded-full text-primary font-bold shrink-0">01</div><div><h4 class="text-lg font-bold mb-2 text-primary">深时地球研究</h4><p class="text-sm text-slate-600 leading-relaxed">在寒武纪大爆发、生物大灭绝等关键科学问题上保持国际领先地位，为理解全球气候变化提供地质历史参考。</p></div></div><div class="flex gap-6"><div class="w-12 h-12 bg-slate-100 flex items-center justify-center rounded-full text-primary font-bold shrink-0">02</div><div><h4 class="text-lg font-bold mb-2 text-primary">化石遗产保护</h4><p class="text-sm text-slate-600 leading-relaxed">推动《古生物化石保护条例》的实施，确立了数千个重要化石产地的科学价值与法律地位。</p></div></div><div class="flex gap-6"><div class="w-12 h-12 bg-slate-100 flex items-center justify-center rounded-full text-primary font-bold shrink-0">03</div><div><h4 class="text-lg font-bold mb-2 text-primary">国际合作枢纽</h4><p class="text-sm text-slate-600 leading-relaxed">作为国际古生物协会的重要成员，学会多次承办国际地质大会及分会，提升了中国科学界的国际话语权。</p></div></div></div>',
 'PUBLISHED', '0', 3, NOW(), 'admin');
