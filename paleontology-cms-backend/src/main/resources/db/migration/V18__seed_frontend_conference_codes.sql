-- 补齐前端 conferenceCode（与 website/admin shared/constants 对齐）
-- 解决「会议不存在或未开放线上报名：demo-conf」等报错

-- 确保 conference_code 唯一，便于按前端 confId 查找
ALTER TABLE paleo_conference
    ADD UNIQUE INDEX uk_conference_code (conference_code);

-- 修正 V17 已有记录的编码与状态
UPDATE paleo_conference
SET conference_code = 'conf-zgswxh-1',
    conference_title = '中国古生物学会第32届学术年会',
    city = '南京',
    start_date = '2026-10-15',
    end_date = '2026-10-19',
    status = 'OPEN'
WHERE conference_id = 1;

-- 历史种子 conf1/conf4 与前端 conf-1/conf-4 不一致，保留旧记录但清空冲突编码
UPDATE paleo_conference SET conference_code = 'legacy-conf1' WHERE conference_id = 2 AND conference_code = 'conf1';
UPDATE paleo_conference SET conference_code = 'legacy-conf4' WHERE conference_id = 3 AND conference_code = 'conf4';

-- 按前端 confId 插入缺失会议（association_id 对应 V11 分会种子）
INSERT INTO paleo_conference (association_id, conference_code, conference_title, city, start_date, end_date, status)
SELECT * FROM (
    SELECT 2 AS association_id, 'demo-conf' AS conference_code, '【演示会议】古无脊椎动物学学术工作坊' AS conference_title, '线上' AS city, '2026-06-15' AS start_date, '2026-06-15' AS end_date, 'OPEN' AS status
    UNION ALL SELECT 6, 'conf-1', '第十五届全国微体古生物学学术研讨会', '南京', '2026-11-15', '2026-11-18', 'OPEN'
    UNION ALL SELECT 3, 'conf-2', '2026年度古植物学与环境演变论坛', '北京', '2026-12-05', '2026-12-05', 'OPEN'
    UNION ALL SELECT 8, 'conf-3', '热河生物群国际学术研讨会', '朝阳', '2027-03-20', '2027-03-20', 'OPEN'
    UNION ALL SELECT 8, 'conf-4', '第十二届全国古脊椎动物学学术年会', '昆明', '2026-09-18', '2026-09-21', 'OPEN'
    UNION ALL SELECT 11, 'conf-5', '中国孢粉学会第十届全国学术大会', '广州', '2026-10-22', '2026-10-25', 'OPEN'
    UNION ALL SELECT 10, 'conf-6', '古生态学与古环境重建国际研讨会', '成都', '2026-08-10', '2026-08-13', 'OPEN'
    UNION ALL SELECT 1, 'conf-7', '地球生物学前沿论坛', '武汉', '2026-07-05', '2026-07-07', 'OPEN'
    UNION ALL SELECT 1, 'conf-8', '古生物学新技术新方法专题研讨会', '武汉', '2026-11-28', '2026-11-30', 'OPEN'
    UNION ALL SELECT 1, 'conf-zgswxh-2', '中国古生物学会国际古生物学前沿论坛', '北京', '2027-04-10', '2027-04-13', 'OPEN'
) AS seed
WHERE NOT EXISTS (
    SELECT 1 FROM paleo_conference pc WHERE pc.conference_code = seed.conference_code
);
