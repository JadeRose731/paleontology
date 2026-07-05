-- 为 paleo_association 增加前端分会编码，补齐缺失分会，同步演示用户绑定，清理 legacy 报名

ALTER TABLE paleo_association
    ADD COLUMN branch_code VARCHAR(32) DEFAULT NULL COMMENT '前端分会编码' AFTER association_type;

UPDATE paleo_association SET branch_code = 'zgswxh' WHERE association_id = 1;
UPDATE paleo_association SET branch_code = 'gwjzdwxfh' WHERE association_id = 2;
UPDATE paleo_association SET branch_code = 'gzwxfh' WHERE association_id = 3;
UPDATE paleo_association SET branch_code = 'kpgzwyh' WHERE association_id = 4;
UPDATE paleo_association SET branch_code = 'wtxfh' WHERE association_id = 6;
UPDATE paleo_association SET branch_code = 'hszlzwyh' WHERE association_id = 7;
UPDATE paleo_association SET branch_code = 'gjzdw' WHERE association_id = 8;
UPDATE paleo_association SET branch_code = 'gst' WHERE association_id = 10;
UPDATE paleo_association SET branch_code = 'bfxfh' WHERE association_id = 11;

INSERT INTO paleo_association (association_name, association_type, sort_order, branch_code)
SELECT '地球生物学分会', 'BRANCH', 12, 'dqswx'
WHERE NOT EXISTS (SELECT 1 FROM paleo_association WHERE branch_code = 'dqswx');

INSERT INTO paleo_association (association_name, association_type, sort_order, branch_code)
SELECT '生物沉积学分会', 'BRANCH', 13, 'swcj'
WHERE NOT EXISTS (SELECT 1 FROM paleo_association WHERE branch_code = 'swcj');

INSERT INTO paleo_association (association_name, association_type, sort_order, branch_code)
SELECT '新技术新方法专业委员会', 'BRANCH', 14, 'xjsxff'
WHERE NOT EXISTS (SELECT 1 FROM paleo_association WHERE branch_code = 'xjsxff');

-- 演示用户默认绑定古无脊椎动物学分会（与前端演示数据一致）
INSERT INTO paleo_user_binding (user_id, association_id, binding_status)
SELECT u.user_id, a.association_id, 'BOUND'
FROM paleo_user u
CROSS JOIN paleo_association a
WHERE u.email = 'demo@paleontology.org.cn'
  AND a.branch_code = 'gwjzdwxfh'
  AND NOT EXISTS (
      SELECT 1 FROM paleo_user_binding b
      WHERE b.user_id = u.user_id AND b.association_id = a.association_id
  );

-- 清理 legacy 会议的历史报名（前端不展示，避免个人中心与学会服务不一致）
DELETE r FROM paleo_conference_registration r
INNER JOIN paleo_conference c ON r.conference_id = c.conference_id
WHERE c.conference_code LIKE 'legacy-%';
