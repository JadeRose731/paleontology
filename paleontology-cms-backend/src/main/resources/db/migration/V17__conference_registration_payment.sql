-- 会议编码（与前端 confId 对齐）及报名缴费字段扩展

ALTER TABLE paleo_conference
    ADD COLUMN conference_code VARCHAR(64) DEFAULT NULL COMMENT '前端会议ID' AFTER association_id;

UPDATE paleo_conference SET conference_code = 'conf-zgswxh-1' WHERE conference_id = 1;
UPDATE paleo_conference SET conference_code = 'conf1' WHERE conference_id = 2;
UPDATE paleo_conference SET conference_code = 'conf4' WHERE conference_id = 3;

ALTER TABLE paleo_conference_registration
    ADD COLUMN voucher_url VARCHAR(500) DEFAULT NULL COMMENT '缴费凭证' AFTER payment_status,
    ADD COLUMN invoice_url VARCHAR(500) DEFAULT NULL COMMENT '电子发票' AFTER voucher_url,
    ADD COLUMN review_comment VARCHAR(500) DEFAULT NULL COMMENT '审核意见' AFTER invoice_url,
    ADD COLUMN voucher_submit_time DATETIME DEFAULT NULL AFTER review_comment,
    ADD COLUMN voucher_audit_time DATETIME DEFAULT NULL AFTER voucher_submit_time,
    ADD COLUMN invoice_submit_time DATETIME DEFAULT NULL AFTER voucher_audit_time,
    ADD COLUMN invoice_audit_time DATETIME DEFAULT NULL AFTER invoice_submit_time,
    ADD COLUMN invoice_deadline DATE DEFAULT NULL AFTER invoice_audit_time;

-- 将历史 PENDING 统一为待审凭证状态
UPDATE paleo_conference_registration
SET payment_status = 'VOUCHER_REVIEW'
WHERE payment_status = 'PENDING';
