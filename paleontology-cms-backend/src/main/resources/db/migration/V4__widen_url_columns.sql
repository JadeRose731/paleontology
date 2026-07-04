-- 放宽 URL 字段长度（外部 CDN 链接可能较长；仍应优先存 /uploads 相对路径）
ALTER TABLE paleo_cms_entry
    MODIFY COLUMN cover_url VARCHAR(2000) DEFAULT NULL COMMENT '封面/背景图',
    MODIFY COLUMN media_url VARCHAR(2000) DEFAULT NULL COMMENT '媒体地址',
    MODIFY COLUMN file_url  VARCHAR(2000) DEFAULT NULL COMMENT '附件/下载地址',
    MODIFY COLUMN link_url  VARCHAR(2000) DEFAULT NULL COMMENT '外部链接';
