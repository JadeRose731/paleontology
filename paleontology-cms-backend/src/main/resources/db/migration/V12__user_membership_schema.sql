-- Phase 1: 网站用户 + 入会/退会申请 + 会员档案/缴费字段扩展
-- 注意：paleo_member_profile / paleo_membership_payment 的 create_by 等审计字段已在 V11 创建

CREATE TABLE IF NOT EXISTS paleo_user (
    user_id                 BIGINT       NOT NULL AUTO_INCREMENT COMMENT '用户ID',
    email                   VARCHAR(128) NOT NULL COMMENT '登录邮箱',
    password_hash           VARCHAR(128) NOT NULL COMMENT '密码哈希',
    user_name               VARCHAR(100) DEFAULT NULL COMMENT '姓名',
    gender                  VARCHAR(10)  DEFAULT NULL COMMENT '性别',
    unit                    VARCHAR(200) DEFAULT NULL COMMENT '单位',
    role_label              VARCHAR(20)  DEFAULT NULL COMMENT '学生/教师/嘉宾',
    title                   VARCHAR(100) DEFAULT NULL COMMENT '职称',
    is_student              CHAR(1)      DEFAULT '0' COMMENT '是否学生 0/1',
    user_type               VARCHAR(20)  DEFAULT 'regular' COMMENT 'regular/non_member/member',
    membership_choice_made  CHAR(1)      DEFAULT '0' COMMENT '是否已完成会员路径选择',
    status                  CHAR(1)      DEFAULT '1' COMMENT '0停用 1正常',
    create_by               VARCHAR(64)  DEFAULT '',
    create_time             DATETIME     DEFAULT CURRENT_TIMESTAMP,
    update_by               VARCHAR(64)  DEFAULT '',
    update_time             DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id),
    UNIQUE KEY uk_paleo_user_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='网站用户';

CREATE TABLE IF NOT EXISTS paleo_membership_application (
    application_id      BIGINT       NOT NULL AUTO_INCREMENT COMMENT '申请ID',
    user_id             BIGINT       NOT NULL COMMENT '用户ID',
    application_type    VARCHAR(20)  NOT NULL COMMENT 'JOIN/WITHDRAW',
    member_category     VARCHAR(40)  DEFAULT NULL COMMENT 'student_member/non_student_member',
    applicant_name      VARCHAR(100) DEFAULT NULL,
    applicant_phone     VARCHAR(30)  DEFAULT NULL,
    applicant_email     VARCHAR(128) DEFAULT NULL,
    application_file_url VARCHAR(500) DEFAULT NULL COMMENT '申请书附件',
    review_status       VARCHAR(20)  DEFAULT 'PENDING' COMMENT 'PENDING/APPROVED/REJECTED',
    review_comment      VARCHAR(500) DEFAULT NULL,
    reviewer            VARCHAR(64)  DEFAULT NULL,
    review_time         DATETIME     DEFAULT NULL,
    create_by           VARCHAR(64)  DEFAULT '',
    create_time         DATETIME     DEFAULT CURRENT_TIMESTAMP,
    update_by           VARCHAR(64)  DEFAULT '',
    update_time         DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (application_id),
    KEY idx_app_user (user_id),
    KEY idx_app_status (review_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='入会/退会申请';

-- 扩展会员档案：仅新增 V11 没有的列
ALTER TABLE paleo_member_profile
    ADD COLUMN latest_application_id BIGINT DEFAULT NULL COMMENT '最近申请ID' AFTER valid_end_date,
    ADD COLUMN latest_payment_id BIGINT DEFAULT NULL COMMENT '最近缴费ID' AFTER latest_application_id;

-- 扩展会员费缴纳：仅新增 V11 没有的列
ALTER TABLE paleo_membership_payment
    ADD COLUMN application_id BIGINT DEFAULT NULL COMMENT '关联入会申请' AFTER user_id,
    ADD COLUMN valid_start_date DATE DEFAULT NULL AFTER review_comment,
    ADD COLUMN valid_end_date DATE DEFAULT NULL AFTER valid_start_date;
