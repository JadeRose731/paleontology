-- CMS 内容条目（与 PaleontologicalResearch V0.0.17 + V0.0.18 对齐）
CREATE TABLE IF NOT EXISTS paleo_cms_entry (
    entry_id        BIGINT       NOT NULL AUTO_INCREMENT COMMENT 'CMS内容ID',
    association_id  BIGINT       DEFAULT NULL COMMENT '学会/分会ID，空表示总站',
    module_code     VARCHAR(64)  NOT NULL COMMENT '模块编码',
    column_code     VARCHAR(64)  DEFAULT NULL COMMENT '栏目编码',
    scope           VARCHAR(32)  DEFAULT 'society' COMMENT '范围 society/branch/party',
    title           VARCHAR(255) NOT NULL COMMENT '标题',
    category        VARCHAR(128) DEFAULT NULL COMMENT '分类',
    summary         VARCHAR(1000) DEFAULT NULL COMMENT '摘要',
    body_content    TEXT         NULL COMMENT '正文富文本',
    cover_url       VARCHAR(500) DEFAULT NULL COMMENT '封面/背景图',
    media_url       VARCHAR(500) DEFAULT NULL COMMENT '媒体地址',
    file_url        VARCHAR(500) DEFAULT NULL COMMENT '附件/下载地址',
    link_url        VARCHAR(500) DEFAULT NULL COMMENT '外部链接',
    extra_json      TEXT         NULL COMMENT '扩展字段JSON',
    file_extension  VARCHAR(32)  DEFAULT NULL COMMENT '文件扩展名',
    file_size       BIGINT       DEFAULT 0 COMMENT '文件大小',
    ref_count       INT          DEFAULT 0 COMMENT '引用次数',
    member_only     CHAR(1)      DEFAULT '0' COMMENT '仅会员可见/下载',
    pinned          CHAR(1)      DEFAULT '0' COMMENT '是否置顶',
    sort_order      INT          DEFAULT 0 COMMENT '排序',
    publish_time    DATETIME     DEFAULT NULL COMMENT '发布时间',
    status          VARCHAR(32)  DEFAULT 'DRAFT' COMMENT 'DRAFT/PUBLISHED/ARCHIVED',
    deleted         CHAR(1)      DEFAULT '0' COMMENT '逻辑删除',
    create_by       VARCHAR(64)  DEFAULT '' COMMENT '创建者',
    create_time     DATETIME     DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_by       VARCHAR(64)  DEFAULT '' COMMENT '更新者',
    update_time     DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    remark          VARCHAR(500) DEFAULT NULL COMMENT '备注',
    PRIMARY KEY (entry_id),
    KEY idx_paleo_cms_module (module_code),
    KEY idx_paleo_cms_association (association_id),
    KEY idx_paleo_cms_status (status),
    KEY idx_paleo_cms_deleted (deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='完整CMS通用内容表';

-- CMS 栏目编排
CREATE TABLE IF NOT EXISTS paleo_cms_channel (
    channel_id      BIGINT       NOT NULL AUTO_INCREMENT COMMENT '栏目ID',
    association_id  BIGINT       DEFAULT NULL COMMENT '分会ID',
    channel_code    VARCHAR(64)  NOT NULL COMMENT '栏目编码',
    parent_id       BIGINT       DEFAULT 0 COMMENT '父栏目ID',
    route_path      VARCHAR(255) DEFAULT NULL COMMENT '前台路由',
    nav_name        VARCHAR(128) DEFAULT NULL COMMENT '导航名称',
    sort_order      INT          DEFAULT 0 COMMENT '排序',
    visible         CHAR(1)      DEFAULT '1' COMMENT '是否显示',
    title           VARCHAR(255) DEFAULT NULL COMMENT '页面主标题',
    subtitle        VARCHAR(500) DEFAULT NULL COMMENT '页面副标题',
    kicker          VARCHAR(255) DEFAULT NULL COMMENT '栏目前导语',
    breadcrumb_name VARCHAR(128) DEFAULT NULL COMMENT '面包屑名称',
    layout_type     VARCHAR(64)  DEFAULT NULL COMMENT '版式类型',
    layout_params   TEXT         NULL COMMENT '版式参数JSON',
    content_module  VARCHAR(64)  DEFAULT NULL COMMENT '绑定内容模块',
    content_filter  TEXT         NULL COMMENT '内容筛选JSON',
    page_type       VARCHAR(32)  DEFAULT 'CMS' COMMENT 'CMS/CUSTOM/HYBRID',
    shell_type      VARCHAR(32)  DEFAULT NULL COMMENT '壳层 home/standard/party',
    status          VARCHAR(32)  DEFAULT 'DRAFT' COMMENT 'DRAFT/PUBLISHED/ARCHIVED',
    locked          CHAR(1)      DEFAULT '0' COMMENT '定制页锁定',
    deleted         CHAR(1)      DEFAULT '0' COMMENT '逻辑删除',
    create_by       VARCHAR(64)  DEFAULT '',
    create_time     DATETIME     DEFAULT CURRENT_TIMESTAMP,
    update_by       VARCHAR(64)  DEFAULT '',
    update_time     DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    remark          VARCHAR(500) DEFAULT NULL,
    PRIMARY KEY (channel_id),
    UNIQUE KEY uk_channel_code (channel_code),
    KEY idx_channel_route (route_path),
    KEY idx_channel_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='CMS栏目编排';

-- CMS 页面区块
CREATE TABLE IF NOT EXISTS paleo_cms_block (
    block_id        BIGINT       NOT NULL AUTO_INCREMENT COMMENT '区块ID',
    channel_id      BIGINT       NOT NULL COMMENT '所属栏目',
    block_type      VARCHAR(64)  DEFAULT NULL COMMENT '区块类型',
    title           VARCHAR(255) DEFAULT NULL COMMENT '区块标题',
    body_content    TEXT         NULL COMMENT '区块内容',
    data_source     TEXT         NULL COMMENT '数据来源JSON',
    sort_order      INT          DEFAULT 0 COMMENT '排序',
    visible         CHAR(1)      DEFAULT '1' COMMENT '是否显示',
    status          VARCHAR(32)  DEFAULT 'DRAFT' COMMENT 'DRAFT/PUBLISHED/ARCHIVED',
    deleted         CHAR(1)      DEFAULT '0' COMMENT '逻辑删除',
    create_by       VARCHAR(64)  DEFAULT '',
    create_time     DATETIME     DEFAULT CURRENT_TIMESTAMP,
    update_by       VARCHAR(64)  DEFAULT '',
    update_time     DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    remark          VARCHAR(500) DEFAULT NULL,
    PRIMARY KEY (block_id),
    KEY idx_block_channel (channel_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='CMS页面区块';

-- 简易管理员（JWT 登录）
CREATE TABLE IF NOT EXISTS cms_admin_user (
    user_id         BIGINT       NOT NULL AUTO_INCREMENT,
    username        VARCHAR(64)  NOT NULL,
    password_hash   VARCHAR(128) NOT NULL COMMENT 'BCrypt',
    display_name    VARCHAR(64)  DEFAULT NULL,
    role            VARCHAR(32)  DEFAULT 'admin' COMMENT 'admin/branch_admin',
    branch_id       VARCHAR(32)  DEFAULT NULL COMMENT '分会编码',
    status          CHAR(1)      DEFAULT '1' COMMENT '1正常 0停用',
    create_time     DATETIME     DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id),
    UNIQUE KEY uk_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='CMS管理员';

-- 默认管理员由 AdminUserInitializer 在启动时创建（admin / admin123）
