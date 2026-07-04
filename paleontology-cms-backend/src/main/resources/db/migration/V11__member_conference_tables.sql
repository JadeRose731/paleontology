-- 学会/分会表
CREATE TABLE IF NOT EXISTS paleo_association (
    association_id  BIGINT       NOT NULL AUTO_INCREMENT COMMENT '学会/分会ID',
    association_name VARCHAR(100) NOT NULL COMMENT '名称',
    association_type VARCHAR(20)  NOT NULL DEFAULT 'BRANCH' COMMENT 'MAIN/BRANCH',
    sort_order      INT          DEFAULT 0,
    status          CHAR(1)      DEFAULT '0' COMMENT '0正常 1停用',
    description     VARCHAR(500) DEFAULT NULL,
    create_by       VARCHAR(64)  DEFAULT '',
    create_time     DATETIME     DEFAULT CURRENT_TIMESTAMP,
    update_by       VARCHAR(64)  DEFAULT '',
    update_time     DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (association_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='学会/分会';

-- 用户绑定学会
CREATE TABLE IF NOT EXISTS paleo_user_binding (
    binding_id      BIGINT       NOT NULL AUTO_INCREMENT,
    user_id         BIGINT       NOT NULL COMMENT '用户ID',
    association_id  BIGINT       NOT NULL,
    binding_status  VARCHAR(20)  DEFAULT 'BOUND',
    create_by       VARCHAR(64)  DEFAULT '',
    create_time     DATETIME     DEFAULT CURRENT_TIMESTAMP,
    update_by       VARCHAR(64)  DEFAULT '',
    update_time     DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (binding_id),
    UNIQUE KEY uk_user_assoc (user_id, association_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户学会绑定';

-- 会员档案
CREATE TABLE IF NOT EXISTS paleo_member_profile (
    profile_id      BIGINT       NOT NULL AUTO_INCREMENT,
    user_id         BIGINT       NOT NULL,
    user_name       VARCHAR(100) DEFAULT NULL COMMENT '姓名',
    member_status   VARCHAR(20)  DEFAULT 'NON_MEMBER' COMMENT 'NON_MEMBER/ACTIVE/EXPIRED',
    member_category VARCHAR(40)  DEFAULT NULL COMMENT 'student_member/non_student_member',
    valid_start_date DATE        DEFAULT NULL,
    valid_end_date   DATE        DEFAULT NULL,
    create_by       VARCHAR(64)  DEFAULT '',
    create_time     DATETIME     DEFAULT CURRENT_TIMESTAMP,
    update_by       VARCHAR(64)  DEFAULT '',
    update_time     DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (profile_id),
    UNIQUE KEY uk_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='会员档案';

-- 会员费缴纳
CREATE TABLE IF NOT EXISTS paleo_membership_payment (
    payment_id      BIGINT       NOT NULL AUTO_INCREMENT,
    user_id         BIGINT       NOT NULL,
    member_category VARCHAR(40)  DEFAULT NULL,
    amount          DECIMAL(10,2) DEFAULT NULL,
    payment_status  VARCHAR(30)  DEFAULT 'VOUCHER_REVIEW' COMMENT '缴费状态',
    voucher_url     VARCHAR(500) DEFAULT NULL,
    invoice_url     VARCHAR(500) DEFAULT NULL,
    review_comment  VARCHAR(500) DEFAULT NULL,
    create_by       VARCHAR(64)  DEFAULT '',
    create_time     DATETIME     DEFAULT CURRENT_TIMESTAMP,
    update_by       VARCHAR(64)  DEFAULT '',
    update_time     DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (payment_id),
    KEY idx_payment_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='会员费缴纳';

-- 会议
CREATE TABLE IF NOT EXISTS paleo_conference (
    conference_id   BIGINT       NOT NULL AUTO_INCREMENT,
    association_id  BIGINT       NOT NULL,
    conference_title VARCHAR(200) NOT NULL,
    city            VARCHAR(60)  DEFAULT NULL,
    start_date      DATE         DEFAULT NULL,
    end_date        DATE         DEFAULT NULL,
    status          VARCHAR(20)  DEFAULT 'DRAFT' COMMENT 'DRAFT/OPEN/CLOSED',
    create_by       VARCHAR(64)  DEFAULT '',
    create_time     DATETIME     DEFAULT CURRENT_TIMESTAMP,
    update_by       VARCHAR(64)  DEFAULT '',
    update_time     DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (conference_id),
    KEY idx_conf_assoc (association_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='会议';

-- 会议报名
CREATE TABLE IF NOT EXISTS paleo_conference_registration (
    registration_id BIGINT       NOT NULL AUTO_INCREMENT,
    conference_id   BIGINT       NOT NULL,
    association_id  BIGINT       DEFAULT NULL,
    user_id         BIGINT       NOT NULL,
    fee_type        VARCHAR(40)  DEFAULT NULL COMMENT '四类费用类型',
    fee_amount      DECIMAL(10,2) DEFAULT NULL,
    payment_status  VARCHAR(30)  DEFAULT 'PENDING',
    create_by       VARCHAR(64)  DEFAULT '',
    create_time     DATETIME     DEFAULT CURRENT_TIMESTAMP,
    update_by       VARCHAR(64)  DEFAULT '',
    update_time     DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (registration_id),
    KEY idx_reg_conf (conference_id),
    KEY idx_reg_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='会议报名';

-- 插入种子数据：学会/分会
INSERT INTO paleo_association (association_name, association_type, sort_order) VALUES
('古生物学会（总学会）', 'MAIN', 0),
('古无脊椎动物学分会', 'BRANCH', 1),
('古植物学分会', 'BRANCH', 2),
('科普工作委员会', 'BRANCH', 3),
('地层学分会', 'BRANCH', 4),
('微体学分会', 'BRANCH', 5),
('化石藻类专业委员会', 'BRANCH', 6),
('古脊椎动物学分会', 'BRANCH', 7),
('早期生命研究分会', 'BRANCH', 8),
('古生态学分会', 'BRANCH', 9),
('孢粉学分会', 'BRANCH', 10),
('遗迹学分会', 'BRANCH', 11);

-- 插入种子数据：模拟会员
INSERT INTO paleo_member_profile (user_id, user_name, member_status, member_category) VALUES
(1, '张明', 'ACTIVE', 'non_student_member'),
(2, '李华', 'ACTIVE', 'non_student_member'),
(3, '王芳', 'ACTIVE', 'student_member'),
(4, '赵强', 'ACTIVE', 'non_student_member'),
(5, '陈晓', 'ACTIVE', 'student_member'),
(6, '刘伟', 'ACTIVE', 'non_student_member'),
(7, '杨丽', 'ACTIVE', 'student_member'),
(8, '黄磊', 'ACTIVE', 'non_student_member'),
(9, '周波', 'ACTIVE', 'student_member'),
(10, '吴佳', 'ACTIVE', 'non_student_member'),
(11, '孙悦', 'ACTIVE', 'student_member'),
(12, '马超', 'ACTIVE', 'non_student_member'),
(13, '朱琳', 'ACTIVE', 'student_member'),
(14, '徐军', 'ACTIVE', 'non_student_member'),
(15, '胡涛', 'ACTIVE', 'non_student_member'),
(16, '林静', 'ACTIVE', 'student_member'),
(17, '何强', 'ACTIVE', 'non_student_member'),
(18, '郭芳', 'ACTIVE', 'student_member'),
(19, '高峰', 'ACTIVE', 'non_student_member'),
(20, '罗杰', 'ACTIVE', 'non_student_member'),
(21, '谢涛', 'ACTIVE', 'student_member'),
(22, '韩梅', 'ACTIVE', 'student_member'),
(23, '唐浩', 'ACTIVE', 'non_student_member'),
(24, '冯蕊', 'ACTIVE', 'student_member'),
(25, '董磊', 'ACTIVE', 'non_student_member'),
(26, '蒋楠', 'ACTIVE', 'student_member'),
(27, '沈阳', 'ACTIVE', 'non_student_member'),
(28, '彭涛', 'NON_MEMBER', NULL),
(29, '陆婷', 'ACTIVE', 'non_student_member'),
(30, '袁飞', 'ACTIVE', 'student_member'),
(31, '邓丽', 'ACTIVE', 'non_student_member'),
(32, '曹洁', 'NON_MEMBER', 'student_member'),
(33, '许强', 'ACTIVE', 'non_student_member'),
(34, '田静', 'ACTIVE', 'student_member'),
(35, '潘伟', 'ACTIVE', 'non_student_member');

-- 模拟用户绑定学会
INSERT INTO paleo_user_binding (user_id, association_id, binding_status) VALUES
(1, 1, 'BOUND'), (2, 1, 'BOUND'), (3, 1, 'BOUND'), (4, 1, 'BOUND'), (5, 1, 'BOUND'),
(6, 1, 'BOUND'), (7, 1, 'BOUND'), (8, 1, 'BOUND'), (9, 1, 'BOUND'), (10, 1, 'BOUND'),
(11, 1, 'BOUND'), (12, 1, 'BOUND'), (13, 1, 'BOUND'), (14, 1, 'BOUND'), (15, 1, 'BOUND'),
(16, 1, 'BOUND'), (17, 1, 'BOUND'), (18, 1, 'BOUND'), (19, 1, 'BOUND'), (20, 1, 'BOUND'),
(21, 1, 'BOUND'), (22, 1, 'BOUND'), (23, 1, 'BOUND'), (24, 1, 'BOUND'), (25, 1, 'BOUND'),
(26, 1, 'BOUND'), (27, 1, 'BOUND'), (28, 1, 'BOUND'), (29, 1, 'BOUND'), (30, 1, 'BOUND'),
(31, 1, 'BOUND'), (32, 1, 'BOUND'), (33, 1, 'BOUND'), (34, 1, 'BOUND'), (35, 1, 'BOUND'),
(1, 2, 'BOUND'), (3, 2, 'BOUND'), (5, 2, 'BOUND'),
(2, 3, 'BOUND'), (7, 3, 'BOUND'), (9, 3, 'BOUND'),
(4, 4, 'BOUND'), (6, 4, 'BOUND'), (8, 4, 'BOUND'), (10, 4, 'BOUND'), (12, 4, 'BOUND'),
(11, 5, 'BOUND'), (13, 5, 'BOUND'), (15, 5, 'BOUND'), (17, 5, 'BOUND'), (19, 5, 'BOUND'),
(14, 6, 'BOUND'), (16, 6, 'BOUND'), (18, 6, 'BOUND'), (20, 6, 'BOUND'), (22, 6, 'BOUND'),
(21, 6, 'BOUND'), (23, 6, 'BOUND'), (24, 6, 'BOUND'),
(25, 7, 'BOUND'), (26, 7, 'BOUND'), (27, 7, 'BOUND'),
(28, 8, 'BOUND'), (29, 8, 'BOUND'), (30, 8, 'BOUND'),
(31, 9, 'BOUND'), (32, 9, 'BOUND'), (33, 9, 'BOUND'),
(34, 10, 'BOUND'), (35, 10, 'BOUND'),
(1, 11, 'BOUND'), (2, 11, 'BOUND'), (3, 11, 'BOUND'),
(20, 12, 'BOUND'), (21, 12, 'BOUND'), (22, 12, 'BOUND');

-- 模拟会员费缴纳记录
INSERT INTO paleo_membership_payment (user_id, member_category, amount, payment_status) VALUES
(1, 'non_student_member', 200.00, 'CONFIRMED'),
(2, 'non_student_member', 200.00, 'CONFIRMED'),
(3, 'student_member', 50.00, 'CONFIRMED'),
(4, 'non_student_member', 200.00, 'CONFIRMED'),
(5, 'student_member', 50.00, 'CONFIRMED'),
(6, 'non_student_member', 200.00, 'CONFIRMED'),
(7, 'student_member', 50.00, 'CONFIRMED'),
(8, 'non_student_member', 200.00, 'CONFIRMED'),
(9, 'student_member', 50.00, 'CONFIRMED'),
(10, 'non_student_member', 200.00, 'CONFIRMED'),
(11, 'student_member', 50.00, 'CONFIRMED'),
(12, 'non_student_member', 200.00, 'CONFIRMED'),
(13, 'student_member', 50.00, 'VOUCHER_REVIEW'),
(14, 'non_student_member', 200.00, 'CONFIRMED'),
(15, 'non_student_member', 200.00, 'CONFIRMED');

-- 模拟会议
INSERT INTO paleo_conference (association_id, conference_title, city, start_date, end_date, status) VALUES
(1, '2026年中国古生物学会学术年会', '南京', '2026-09-18', '2026-09-21', 'OPEN'),
(2, '第十二届古无脊椎动物学术研讨会', '武汉', '2026-08-10', '2026-08-12', 'OPEN'),
(4, '古生物科普教育工作会议', '北京', '2026-07-20', '2026-07-21', 'OPEN');

-- 模拟会议报名
INSERT INTO paleo_conference_registration (conference_id, association_id, user_id, fee_type, fee_amount, payment_status) VALUES
(1, 1, 1, 'non_student_member', 800.00, 'CONFIRMED'),
(1, 1, 2, 'non_student_member', 800.00, 'CONFIRMED'),
(1, 1, 3, 'student_member', 400.00, 'CONFIRMED'),
(1, 1, 4, 'non_student_member', 800.00, 'CONFIRMED'),
(1, 1, 5, 'student_member', 400.00, 'CONFIRMED'),
(1, 1, 6, 'non_student_member', 800.00, 'PENDING'),
(2, 2, 1, 'non_student_member', 600.00, 'CONFIRMED'),
(2, 2, 3, 'student_member', 300.00, 'CONFIRMED'),
(2, 2, 5, 'student_member', 300.00, 'CONFIRMED'),
(3, 4, 4, 'non_student_member', 500.00, 'CONFIRMED'),
(3, 4, 6, 'non_student_member', 500.00, 'CONFIRMED'),
(3, 4, 8, 'non_student_member', 500.00, 'CONFIRMED');
