package com.chuanghai.paleo.cms.common;

/** 审计动作编码 — 与 PRD P2-2 对齐 */
public final class AuditAction {

    private AuditAction() {
    }

    public static final String MEMBERSHIP_VOUCHER_APPROVE = "MEMBERSHIP_VOUCHER_APPROVE";
    public static final String MEMBERSHIP_VOUCHER_REJECT = "MEMBERSHIP_VOUCHER_REJECT";
    public static final String MEMBERSHIP_INVOICE_APPROVE = "MEMBERSHIP_INVOICE_APPROVE";
    public static final String MEMBERSHIP_INVOICE_REJECT = "MEMBERSHIP_INVOICE_REJECT";
    public static final String JOIN_APPLICATION_APPROVE = "JOIN_APPLICATION_APPROVE";
    public static final String JOIN_APPLICATION_REJECT = "JOIN_APPLICATION_REJECT";
    public static final String WITHDRAW_APPLICATION_APPROVE = "WITHDRAW_APPLICATION_APPROVE";
    public static final String WITHDRAW_APPLICATION_REJECT = "WITHDRAW_APPLICATION_REJECT";
    public static final String CONFERENCE_VOUCHER_APPROVE = "CONFERENCE_VOUCHER_APPROVE";
    public static final String CONFERENCE_VOUCHER_REJECT = "CONFERENCE_VOUCHER_REJECT";
    public static final String CONFERENCE_INVOICE_APPROVE = "CONFERENCE_INVOICE_APPROVE";
    public static final String CONFERENCE_INVOICE_REJECT = "CONFERENCE_INVOICE_REJECT";
    public static final String ABSTRACT_ADMIN_EDIT = "ABSTRACT_ADMIN_EDIT";
    public static final String ACCOMMODATION_ADMIN_EDIT = "ACCOMMODATION_ADMIN_EDIT";
    public static final String INVOICE_DEADLINE_EXTEND = "INVOICE_DEADLINE_EXTEND";
    public static final String CMS_PUBLISH = "CMS_PUBLISH";
    public static final String CMS_UNPUBLISH = "CMS_UNPUBLISH";
    public static final String ADMIN_BINDING_CREATE = "ADMIN_BINDING_CREATE";
    public static final String ADMIN_BINDING_REMOVE = "ADMIN_BINDING_REMOVE";
    public static final String RECOGNITION_MANUAL_REVIEW = "RECOGNITION_MANUAL_REVIEW";
}
