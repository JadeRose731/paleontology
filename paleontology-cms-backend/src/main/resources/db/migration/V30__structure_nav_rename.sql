-- 组织机构后台菜单：不再显示「人员信息」，与需求「组织机构不涉及人员」对齐

UPDATE paleo_cms_channel
SET nav_name = '组织机构',
    subtitle = '总学会组织机构图与管理系列；人员请在学会简介维护',
    update_by = 'admin'
WHERE channel_code = 'structure' AND deleted = '0';

UPDATE paleo_cms_channel
SET nav_name = '分会栏目'
WHERE channel_code = 'admin_structure_branch' AND deleted = '0';
