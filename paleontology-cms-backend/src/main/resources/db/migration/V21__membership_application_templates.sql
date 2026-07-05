-- 入会/退会申请书模板（管理员上传，用户端公开下载）
CREATE TABLE IF NOT EXISTS paleo_membership_template (
    template_id   BIGINT       NOT NULL AUTO_INCREMENT,
    template_type VARCHAR(20)  NOT NULL COMMENT 'JOIN=入会 WITHDRAW=退会',
    file_name     VARCHAR(255) DEFAULT NULL,
    file_url      VARCHAR(500) DEFAULT NULL,
    update_by     VARCHAR(64)  DEFAULT '',
    update_time   DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (template_id),
    UNIQUE KEY uk_template_type (template_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='入会/退会申请书模板';
