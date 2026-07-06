-- 顶栏导航：公开文件置于规章条例之后
UPDATE paleo_cms_channel
SET sort_order = 11, update_by = 'admin'
WHERE channel_code = 'international' AND deleted = '0';

UPDATE paleo_cms_channel
SET sort_order = 12, update_by = 'admin'
WHERE channel_code = 'regulations' AND deleted = '0';

UPDATE paleo_cms_channel
SET sort_order = 13, update_by = 'admin'
WHERE channel_code = 'public_files' AND deleted = '0';
