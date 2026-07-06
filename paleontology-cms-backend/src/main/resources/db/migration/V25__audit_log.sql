-- P2-2: 管理操作审计追溯

CREATE TABLE IF NOT EXISTS paleo_audit_log (
    log_id          BIGINT       NOT NULL AUTO_INCREMENT,
    operator_id     BIGINT       NOT NULL COMMENT '操作管理员 user_id',
    operator_email  VARCHAR(128) NOT NULL COMMENT '冗余便于查询',
    operator_role   VARCHAR(32)  NOT NULL COMMENT 'super / branch / finance',
    action          VARCHAR(64)  NOT NULL COMMENT '动作编码',
    target_type     VARCHAR(32)  NOT NULL COMMENT 'membership / conference / cms / binding / recognition',
    target_id       VARCHAR(64)  NOT NULL COMMENT '目标 ID',
    association_id  BIGINT       DEFAULT NULL COMMENT '所属分会（范围过滤）',
    summary         VARCHAR(500) NOT NULL COMMENT '人类可读摘要',
    detail_json     TEXT         DEFAULT NULL COMMENT '变更前后快照',
    ip              VARCHAR(64)  DEFAULT NULL COMMENT '客户端 IP',
    create_time     DATETIME     DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (log_id),
    KEY idx_operator (operator_id),
    KEY idx_action (action),
    KEY idx_association (association_id),
    KEY idx_create_time (create_time),
    KEY idx_target (target_type, target_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='管理操作审计日志';
