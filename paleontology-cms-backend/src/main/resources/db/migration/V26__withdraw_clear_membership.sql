-- 退会/重新入会：清除历史会员有效期，作废旧缴费记录

UPDATE paleo_member_profile
SET valid_start_date = NULL,
    valid_end_date   = NULL,
    latest_payment_id = NULL
WHERE member_status IN ('WITHDRAWN', 'PENDING');

UPDATE paleo_membership_payment p
INNER JOIN paleo_member_profile prof ON prof.user_id = p.user_id
SET p.payment_status = 'VOIDED',
    p.update_by = 'migration-v26'
WHERE prof.member_status IN ('WITHDRAWN', 'PENDING')
  AND p.payment_status NOT IN ('VOIDED', 'UNPAID');
