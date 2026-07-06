-- P2-1: 凭证/发票智能识别结果

CREATE TABLE IF NOT EXISTS paleo_recognition_result (
    result_id       BIGINT       NOT NULL AUTO_INCREMENT,
    target_type     VARCHAR(20)  NOT NULL COMMENT 'membership / conference',
    target_id       BIGINT       NOT NULL COMMENT 'payment_id 或 registration_id',
    user_id         BIGINT       NOT NULL COMMENT '关联用户',
    association_id  BIGINT       DEFAULT NULL COMMENT '会议所属分会（会员费可为 NULL）',
    file_role       VARCHAR(20)  NOT NULL COMMENT 'voucher / invoice',
    file_url        VARCHAR(500) NOT NULL COMMENT '文件地址',
    auto_status     VARCHAR(20)  NOT NULL DEFAULT 'pending' COMMENT 'passed / failed / pending',
    auto_detail     TEXT         DEFAULT NULL COMMENT '识别详情 JSON',
    manual_status   VARCHAR(20)  DEFAULT NULL COMMENT 'confirmed / disputed',
    manual_comment  VARCHAR(500) DEFAULT NULL,
    reviewed_by     BIGINT       DEFAULT NULL COMMENT '复核管理员 user_id',
    reviewed_at     DATETIME     DEFAULT NULL,
    create_time     DATETIME     DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (result_id),
    KEY idx_target (target_type, target_id),
    KEY idx_user (user_id),
    KEY idx_association (association_id),
    KEY idx_auto_status (auto_status),
    KEY idx_manual_status (manual_status),
    KEY idx_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='凭证发票智能识别结果';
