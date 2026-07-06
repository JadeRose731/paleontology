-- 将学会/分会「资料下载」整合进「公开文件」，前台移除资料下载导航

-- 1. 迁移 society / branch 范围的 downloads 条目 → public-files
INSERT INTO paleo_cms_entry (
    module_code, column_code, scope, association_id, title, category, summary,
    file_url, file_extension, member_only, status, sort_order, publish_time,
    create_by, extra_json, deleted
)
SELECT
    'public-files',
    CASE
        WHEN LOWER(IFNULL(file_extension, '')) IN ('mp3', 'wav', 'm4a') THEN 'audio'
        WHEN LOWER(IFNULL(file_extension, '')) IN ('mp4', 'avi', 'mov', 'wmv', 'mkv', 'flv') THEN 'video'
        WHEN LOWER(IFNULL(file_extension, '')) IN ('jpeg', 'jpg', 'png', 'gif', 'tiff') THEN 'photo'
        ELSE 'document'
    END,
    scope,
    association_id,
    title,
    category,
    summary,
    file_url,
    file_extension,
    member_only,
    status,
    sort_order,
    publish_time,
    create_by,
    extra_json,
    deleted
FROM paleo_cms_entry
WHERE module_code = 'downloads'
  AND scope IN ('society', 'branch')
  AND deleted = '0';

-- 2. 归档原 society / branch downloads 条目（党建 party 范围保留）
UPDATE paleo_cms_entry
SET deleted = '1', update_by = 'admin'
WHERE module_code = 'downloads'
  AND scope IN ('society', 'branch')
  AND deleted = '0';

-- 3. 隐藏前台「资料下载」频道（/downloads-center 由前端重定向至 /public-downloads）
UPDATE paleo_cms_channel
SET visible = '0',
    show_in_admin = '0',
    admin_section = NULL,
    update_by = 'admin'
WHERE channel_code = 'downloads' AND deleted = '0';

-- 4. 强化「公开文件」频道：取代资料下载在导航中的位置
UPDATE paleo_cms_channel
SET sort_order = 10,
    nav_name = '公开文件',
    title = '公开文件',
    subtitle = '学会公开资料与文件下载，无需登录即可下载',
    update_by = 'admin'
WHERE channel_code = 'public_files' AND deleted = '0';

UPDATE paleo_cms_channel
SET sort_order = 11, update_by = 'admin'
WHERE channel_code = 'international' AND deleted = '0';

UPDATE paleo_cms_channel
SET sort_order = 12, update_by = 'admin'
WHERE channel_code = 'regulations' AND deleted = '0';
