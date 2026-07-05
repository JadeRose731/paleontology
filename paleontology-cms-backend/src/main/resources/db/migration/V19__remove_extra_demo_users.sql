-- 移除多余的硬编码演示账号，仅保留 demo@paleontology.org.cn
-- 同时清理 V11 种子数据误挂到 user_id 1~3 的会员档案

DELETE r FROM paleo_conference_registration r
INNER JOIN paleo_user u ON r.user_id = u.user_id
WHERE u.email IN ('member@paleontology.org.cn', 'student@paleontology.org.cn');

DELETE p FROM paleo_membership_payment p
INNER JOIN paleo_user u ON p.user_id = u.user_id
WHERE u.email IN ('member@paleontology.org.cn', 'student@paleontology.org.cn');

DELETE a FROM paleo_membership_application a
INNER JOIN paleo_user u ON a.user_id = u.user_id
WHERE u.email IN ('member@paleontology.org.cn', 'student@paleontology.org.cn');

DELETE b FROM paleo_user_binding b
INNER JOIN paleo_user u ON b.user_id = u.user_id
WHERE u.email IN ('member@paleontology.org.cn', 'student@paleontology.org.cn');

DELETE mp FROM paleo_member_profile mp
INNER JOIN paleo_user u ON mp.user_id = u.user_id
WHERE u.email IN ('member@paleontology.org.cn', 'student@paleontology.org.cn');

DELETE FROM paleo_user
WHERE email IN ('member@paleontology.org.cn', 'student@paleontology.org.cn');

-- 删除无对应 paleo_user 的孤儿会员档案（V11 模拟数据残留）
DELETE mp FROM paleo_member_profile mp
LEFT JOIN paleo_user u ON mp.user_id = u.user_id
WHERE u.user_id IS NULL;

DELETE b FROM paleo_user_binding b
LEFT JOIN paleo_user u ON b.user_id = u.user_id
WHERE u.user_id IS NULL;
