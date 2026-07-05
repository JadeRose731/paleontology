-- P0-1: 管理员邮箱、角色扩展 + 分会绑定表

ALTER TABLE cms_admin_user
    ADD COLUMN email VARCHAR(128) DEFAULT NULL COMMENT '登录邮箱' AFTER username;

CREATE UNIQUE INDEX uk_cms_admin_email ON cms_admin_user (email);

-- 统一角色命名：admin → super_admin
UPDATE cms_admin_user SET role = 'super_admin' WHERE role = 'admin' OR role IS NULL OR role = '';

-- 已有账号补全邮箱（username 形如邮箱时）
UPDATE cms_admin_user SET email = username WHERE email IS NULL AND username LIKE '%@%';

CREATE TABLE IF NOT EXISTS paleo_admin_association (
    binding_id      BIGINT       NOT NULL AUTO_INCREMENT,
    admin_user_id   BIGINT       NOT NULL COMMENT 'cms_admin_user.user_id',
    association_id  BIGINT       NOT NULL COMMENT 'paleo_association.association_id',
    binding_status  VARCHAR(20)  NOT NULL DEFAULT 'BOUND' COMMENT 'BOUND/UNBOUND',
    create_time     DATETIME     DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (binding_id),
    UNIQUE KEY uk_admin_association (admin_user_id, association_id),
    KEY idx_admin_user (admin_user_id),
    KEY idx_association (association_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='管理员分会绑定';
