package com.chuanghai.paleo.cms.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.chuanghai.paleo.cms.common.AuditAction;
import com.chuanghai.paleo.cms.domain.CmsAdminUser;
import com.chuanghai.paleo.cms.domain.PaleoAuditLog;
import com.chuanghai.paleo.cms.domain.PaleoConference;
import com.chuanghai.paleo.cms.domain.PaleoConferenceRegistration;
import com.chuanghai.paleo.cms.domain.PaleoMembershipApplication;
import com.chuanghai.paleo.cms.domain.PaleoUser;
import com.chuanghai.paleo.cms.domain.PaleoUserBinding;
import com.chuanghai.paleo.cms.mapper.CmsAdminUserMapper;
import com.chuanghai.paleo.cms.mapper.PaleoConferenceMapper;
import com.chuanghai.paleo.cms.mapper.PaleoConferenceRegistrationMapper;
import com.chuanghai.paleo.cms.mapper.PaleoUserBindingMapper;
import com.chuanghai.paleo.cms.mapper.PaleoUserMapper;
import com.chuanghai.paleo.cms.mapper.PaleoAuditLogMapper;
import com.chuanghai.paleo.cms.security.AdminAccessDeniedException;
import com.chuanghai.paleo.cms.security.LoginUser;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import javax.servlet.http.HttpServletRequest;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class AuditLogService extends ServiceImpl<PaleoAuditLogMapper, PaleoAuditLog> {

    @Autowired
    private CmsAdminUserMapper adminUserMapper;

    @Autowired
    private PaleoUserBindingMapper userBindingMapper;

    @Autowired
    private PaleoUserMapper userMapper;

    @Autowired
    private PaleoConferenceRegistrationMapper registrationMapper;

    @Autowired
    private PaleoConferenceMapper conferenceMapper;

    @Autowired
    private AdminScopeService adminScopeService;

    @Autowired
    private ObjectMapper objectMapper;

    public void log(LoginUser operator, String action, String targetType, String targetId,
                    Long associationId, String summary, Object detail) {
        if (operator == null || !StringUtils.hasText(action)) {
            return;
        }
        try {
            PaleoAuditLog entry = new PaleoAuditLog();
            entry.setOperatorId(operator.getUserId());
            entry.setOperatorEmail(resolveOperatorEmail(operator));
            entry.setOperatorRole(mapRole(operator.getRole()));
            entry.setAction(action);
            entry.setTargetType(targetType);
            entry.setTargetId(targetId);
            entry.setAssociationId(associationId);
            entry.setSummary(summary);
            if (detail != null) {
                entry.setDetailJson(detail instanceof String ? (String) detail : objectMapper.writeValueAsString(detail));
            }
            entry.setIp(resolveClientIp());
            entry.setCreateTime(new Date());
            save(entry);
        } catch (Exception ex) {
            // 审计写入失败不影响主流程
        }
    }

    public Page<PaleoAuditLog> listForAdmin(LoginUser user, int pageNum, int pageSize,
                                            String action, String operatorEmail, Long associationId,
                                            String startTime, String endTime, String targetType) {
        if (user == null) {
            throw new AdminAccessDeniedException("未登录");
        }
        if (adminScopeService.isFinanceReviewer(user)) {
            throw new AdminAccessDeniedException("财务审核员无权查看审计日志");
        }

        LambdaQueryWrapper<PaleoAuditLog> wrapper = new LambdaQueryWrapper<PaleoAuditLog>()
                .orderByDesc(PaleoAuditLog::getCreateTime);

        if (adminScopeService.isBranchAdmin(user)) {
            java.util.List<Long> accessible = adminScopeService.resolveAccessibleAssociationIds(user);
            if (accessible.isEmpty()) {
                wrapper.eq(PaleoAuditLog::getLogId, -1L);
            } else {
                wrapper.in(PaleoAuditLog::getAssociationId, accessible);
            }
        }

        if (StringUtils.hasText(action)) {
            wrapper.eq(PaleoAuditLog::getAction, action.trim());
        }
        if (StringUtils.hasText(operatorEmail)) {
            wrapper.like(PaleoAuditLog::getOperatorEmail, operatorEmail.trim());
        }
        if (associationId != null && adminScopeService.isSuperAdmin(user)) {
            wrapper.eq(PaleoAuditLog::getAssociationId, associationId);
        }
        if (StringUtils.hasText(targetType)) {
            wrapper.eq(PaleoAuditLog::getTargetType, targetType.trim());
        }
        if (StringUtils.hasText(startTime)) {
            wrapper.ge(PaleoAuditLog::getCreateTime, startTime.trim());
        }
        if (StringUtils.hasText(endTime)) {
            wrapper.le(PaleoAuditLog::getCreateTime, endTime.trim() + " 23:59:59");
        }

        return page(new Page<>(pageNum, pageSize), wrapper);
    }

    private String resolveOperatorEmail(LoginUser operator) {
        if (operator.getUsername() != null && operator.getUsername().contains("@")) {
            return operator.getUsername();
        }
        CmsAdminUser admin = adminUserMapper.selectById(operator.getUserId());
        if (admin != null && StringUtils.hasText(admin.getEmail())) {
            return admin.getEmail();
        }
        return operator.getUsername() != null ? operator.getUsername() : "unknown";
    }

    private String mapRole(String role) {
        if (AdminScopeService.ROLE_SUPER_ADMIN.equals(role) || AdminScopeService.ROLE_LEGACY_ADMIN.equals(role)) {
            return "super";
        }
        if (AdminScopeService.ROLE_BRANCH_ADMIN.equals(role)) {
            return "branch";
        }
        if (AdminScopeService.ROLE_FINANCE_REVIEWER.equals(role)) {
            return "finance";
        }
        return role != null ? role : "unknown";
    }

    private String resolveClientIp() {
        try {
            ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs == null) {
                return null;
            }
            HttpServletRequest request = attrs.getRequest();
            String forwarded = request.getHeader("X-Forwarded-For");
            if (StringUtils.hasText(forwarded)) {
                return forwarded.split(",")[0].trim();
            }
            return request.getRemoteAddr();
        } catch (Exception ex) {
            return null;
        }
    }

    public Map<String, Object> customerDetailSnapshot(PaleoUser user, String applicationType,
                                                      String memberCategory, String conferenceTitle,
                                                      String beforeStatus, String afterStatus, String comment) {
        Map<String, Object> snap = new LinkedHashMap<>();
        if (user != null) {
            if (StringUtils.hasText(user.getUserName())) {
                snap.put("userName", user.getUserName());
            }
            if (StringUtils.hasText(user.getEmail())) {
                snap.put("userEmail", user.getEmail());
            }
            if (StringUtils.hasText(user.getUnit())) {
                snap.put("userUnit", user.getUnit());
            }
        }
        if (StringUtils.hasText(applicationType)) {
            snap.put("applicationType", applicationTypeLabel(applicationType));
        }
        if (StringUtils.hasText(memberCategory)) {
            snap.put("memberCategory", memberCategoryLabel(memberCategory));
        }
        if (StringUtils.hasText(conferenceTitle)) {
            snap.put("conferenceTitle", conferenceTitle);
        }
        snap.put("statusBefore", statusLabel(beforeStatus));
        snap.put("statusAfter", statusLabel(afterStatus));
        if (StringUtils.hasText(comment)) {
            snap.put("reviewComment", comment);
        }
        return snap;
    }

    public Map<String, Object> cmsContentDetailSnapshot(String contentTitle, String beforeStatus, String afterStatus) {
        Map<String, Object> snap = new LinkedHashMap<>();
        if (StringUtils.hasText(contentTitle)) {
            snap.put("contentTitle", contentTitle);
        }
        snap.put("statusBefore", cmsStatusLabel(beforeStatus));
        snap.put("statusAfter", cmsStatusLabel(afterStatus));
        return snap;
    }

    public void logMembershipPaymentReview(LoginUser operator, Long paymentId, Long userId,
                                           String beforeStatus, String afterStatus, String comment) {
        String action = resolveMembershipReviewAction(beforeStatus, afterStatus);
        if (action == null) {
            return;
        }
        PaleoUser user = userId != null ? userMapper.selectById(userId) : null;
        Long associationId = resolvePrimaryAssociationId(userId);
        log(operator, action, "membership", String.valueOf(paymentId), associationId,
                String.format("会员费审核：%s → %s", statusLabel(beforeStatus), statusLabel(afterStatus)),
                customerDetailSnapshot(user, null, null, null, beforeStatus, afterStatus, comment));
    }

    public void logConferenceRegistrationReview(LoginUser operator, Long registrationId, Long associationId,
                                                String beforeStatus, String afterStatus, String comment) {
        String action = resolveConferenceReviewAction(beforeStatus, afterStatus);
        if (action == null) {
            return;
        }
        PaleoConferenceRegistration registration = registrationMapper.selectById(registrationId);
        PaleoUser user = registration != null && registration.getUserId() != null
                ? userMapper.selectById(registration.getUserId()) : null;
        String conferenceTitle = null;
        if (registration != null && registration.getConferenceId() != null) {
            PaleoConference conference = conferenceMapper.selectById(registration.getConferenceId());
            if (conference != null) {
                conferenceTitle = conference.getConferenceTitle();
            }
        }
        log(operator, action, "conference", String.valueOf(registrationId), associationId,
                String.format("会议费审核：%s → %s", statusLabel(beforeStatus), statusLabel(afterStatus)),
                customerDetailSnapshot(user, null, null, conferenceTitle, beforeStatus, afterStatus, comment));
    }

    public void logApplicationReview(LoginUser operator, PaleoMembershipApplication application,
                                     String beforeStatus, String afterStatus, String comment) {
        if (application == null) {
            return;
        }
        String action = resolveApplicationReviewAction(application.getApplicationType(), afterStatus);
        if (action == null) {
            return;
        }
        PaleoUser user = application.getUserId() != null ? userMapper.selectById(application.getUserId()) : null;
        PaleoUser displayUser = new PaleoUser();
        displayUser.setUserName(StringUtils.hasText(application.getApplicantName())
                ? application.getApplicantName()
                : (user != null ? user.getUserName() : null));
        displayUser.setEmail(StringUtils.hasText(application.getApplicantEmail())
                ? application.getApplicantEmail()
                : (user != null ? user.getEmail() : null));
        displayUser.setUnit(user != null ? user.getUnit() : null);
        Map<String, Object> detail = customerDetailSnapshot(
                displayUser,
                application.getApplicationType(),
                application.getMemberCategory(),
                null,
                beforeStatus,
                afterStatus,
                comment);
        if (StringUtils.hasText(application.getApplicantPhone())) {
            detail.put("userPhone", application.getApplicantPhone());
        }
        String typeLabel = "WITHDRAW".equals(application.getApplicationType()) ? "退会" : "入会";
        log(operator, action, "membership", String.valueOf(application.getApplicationId()), null,
                String.format("%s申请审核：%s → %s", typeLabel, statusLabel(beforeStatus), statusLabel(afterStatus)),
                detail);
    }

    private String statusLabel(String status) {
        if (!StringUtils.hasText(status)) {
            return "未知";
        }
        switch (status) {
            case "PENDING": return "待审核";
            case "APPROVED": return "已通过";
            case "REJECTED": return "已驳回";
            case "UNPAID": return "未缴费";
            case "VOUCHER_REVIEW": return "凭证审核中";
            case "VOUCHER_REJECTED": return "凭证已驳回";
            case "INVOICE_PENDING": return "待上传发票";
            case "INVOICE_REVIEW": return "发票审核中";
            case "INVOICE_REJECTED": return "发票已驳回";
            case "CONFIRMED": return "已确认";
            case "VOIDED": return "已作废";
            case "CANCELLED": return "已取消";
            default: return status;
        }
    }

    private String cmsStatusLabel(String status) {
        if (!StringUtils.hasText(status)) {
            return "未知";
        }
        switch (status) {
            case "DRAFT": return "草稿";
            case "PUBLISHED": return "已发布";
            case "ARCHIVED": return "已归档";
            default: return status;
        }
    }

    private String applicationTypeLabel(String applicationType) {
        if ("WITHDRAW".equals(applicationType)) {
            return "退会申请";
        }
        if ("JOIN".equals(applicationType)) {
            return "入会申请";
        }
        return applicationType;
    }

    private String memberCategoryLabel(String memberCategory) {
        if (!StringUtils.hasText(memberCategory)) {
            return null;
        }
        switch (memberCategory) {
            case "standard": return "普通会员";
            case "student": return "学生会员";
            case "corporate": return "单位会员";
            default: return memberCategory;
        }
    }

    private String resolveMembershipReviewAction(String before, String after) {
        if ("VOUCHER_REVIEW".equals(before)) {
            if ("INVOICE_PENDING".equals(after)) return AuditAction.MEMBERSHIP_VOUCHER_APPROVE;
            if ("VOUCHER_REJECTED".equals(after)) return AuditAction.MEMBERSHIP_VOUCHER_REJECT;
        }
        if ("INVOICE_REVIEW".equals(before)) {
            if ("CONFIRMED".equals(after)) return AuditAction.MEMBERSHIP_INVOICE_APPROVE;
            if ("INVOICE_REJECTED".equals(after)) return AuditAction.MEMBERSHIP_INVOICE_REJECT;
        }
        if ("INVOICE_PENDING".equals(after) && "VOUCHER_REVIEW".equals(before)) {
            return AuditAction.MEMBERSHIP_VOUCHER_APPROVE;
        }
        if ("CONFIRMED".equals(after)) return AuditAction.MEMBERSHIP_INVOICE_APPROVE;
        if ("VOUCHER_REJECTED".equals(after)) return AuditAction.MEMBERSHIP_VOUCHER_REJECT;
        if ("INVOICE_REJECTED".equals(after)) return AuditAction.MEMBERSHIP_INVOICE_REJECT;
        return null;
    }

    private String resolveConferenceReviewAction(String before, String after) {
        if ("VOUCHER_REVIEW".equals(before)) {
            if ("INVOICE_PENDING".equals(after)) return AuditAction.CONFERENCE_VOUCHER_APPROVE;
            if ("VOUCHER_REJECTED".equals(after)) return AuditAction.CONFERENCE_VOUCHER_REJECT;
        }
        if ("INVOICE_REVIEW".equals(before)) {
            if ("CONFIRMED".equals(after)) return AuditAction.CONFERENCE_INVOICE_APPROVE;
            if ("INVOICE_REJECTED".equals(after)) return AuditAction.CONFERENCE_INVOICE_REJECT;
        }
        if ("INVOICE_PENDING".equals(after)) return AuditAction.CONFERENCE_VOUCHER_APPROVE;
        if ("CONFIRMED".equals(after)) return AuditAction.CONFERENCE_INVOICE_APPROVE;
        if ("VOUCHER_REJECTED".equals(after)) return AuditAction.CONFERENCE_VOUCHER_REJECT;
        if ("INVOICE_REJECTED".equals(after)) return AuditAction.CONFERENCE_INVOICE_REJECT;
        return null;
    }

    private String resolveApplicationReviewAction(String applicationType, String afterStatus) {
        boolean withdraw = "WITHDRAW".equals(applicationType);
        if ("APPROVED".equals(afterStatus)) {
            return withdraw ? AuditAction.WITHDRAW_APPLICATION_APPROVE : AuditAction.JOIN_APPLICATION_APPROVE;
        }
        if ("REJECTED".equals(afterStatus)) {
            return withdraw ? AuditAction.WITHDRAW_APPLICATION_REJECT : AuditAction.JOIN_APPLICATION_REJECT;
        }
        return null;
    }

    private Long resolvePrimaryAssociationId(Long userId) {
        if (userId == null) {
            return null;
        }
        PaleoUserBinding binding = userBindingMapper.selectOne(new LambdaQueryWrapper<PaleoUserBinding>()
                .eq(PaleoUserBinding::getUserId, userId)
                .eq(PaleoUserBinding::getBindingStatus, "BOUND")
                .orderByAsc(PaleoUserBinding::getBindingId)
                .last("LIMIT 1"));
        return binding != null ? binding.getAssociationId() : null;
    }
}
