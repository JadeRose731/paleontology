package com.chuanghai.paleo.cms.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.chuanghai.paleo.cms.domain.PaleoMemberProfile;
import com.chuanghai.paleo.cms.domain.PaleoMembershipApplication;
import com.chuanghai.paleo.cms.domain.PaleoMembershipPayment;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class PaleoMembershipStatusService {

    @Autowired
    private PaleoMemberProfileService memberProfileService;

    @Autowired
    private PaleoMembershipPaymentService paymentService;

    @Autowired
    private PaleoMembershipApplicationService applicationService;

    public String resolveForUser(Long userId) {
        PaleoMemberProfile profile = memberProfileService.getOne(new LambdaQueryWrapper<PaleoMemberProfile>()
                .eq(PaleoMemberProfile::getUserId, userId)
                .last("LIMIT 1"));

        PaleoMembershipApplication pendingJoin = applicationService.getOne(new LambdaQueryWrapper<PaleoMembershipApplication>()
                .eq(PaleoMembershipApplication::getUserId, userId)
                .eq(PaleoMembershipApplication::getApplicationType, "JOIN")
                .eq(PaleoMembershipApplication::getReviewStatus, "PENDING")
                .orderByDesc(PaleoMembershipApplication::getCreateTime)
                .last("LIMIT 1"));

        PaleoMembershipPayment latestPayment = paymentService.getOne(new LambdaQueryWrapper<PaleoMembershipPayment>()
                .eq(PaleoMembershipPayment::getUserId, userId)
                .ne(PaleoMembershipPayment::getPaymentStatus, "VOIDED")
                .orderByDesc(PaleoMembershipPayment::getPaymentId)
                .last("LIMIT 1"));

        return resolveMembershipStatus(profile, latestPayment, pendingJoin);
    }

    public String resolveMembershipStatus(PaleoMemberProfile profile,
                                          PaleoMembershipPayment latestPayment,
                                          PaleoMembershipApplication pendingJoin) {
        if (pendingJoin != null) {
            return "application_submitted";
        }
        if (profile != null && profile.getMemberStatus() != null) {
            switch (profile.getMemberStatus()) {
                case "WITHDRAWN":
                    return "withdrawn";
                case "PENDING":
                    return "application_approved";
                case "EXPIRED":
                    return "expired";
                default:
                    break;
            }
        }
        if (latestPayment != null && latestPayment.getPaymentStatus() != null) {
            switch (latestPayment.getPaymentStatus()) {
                case "VOUCHER_REVIEW":
                    return "voucher_submitted";
                case "VOUCHER_REJECTED":
                    return "voucher_rejected";
                case "INVOICE_PENDING":
                    return "invoice_pending";
                case "INVOICE_REVIEW":
                    return "invoice_submitted";
                case "INVOICE_REJECTED":
                    return "invoice_rejected";
                case "CONFIRMED":
                    if (profile != null && "ACTIVE".equals(profile.getMemberStatus())) {
                        return "active";
                    }
                    break;
                default:
                    break;
            }
        }
        if (profile != null && profile.getMemberStatus() != null) {
            switch (profile.getMemberStatus()) {
                case "ACTIVE":
                    return "active";
                case "NON_MEMBER":
                default:
                    return "not_member";
            }
        }
        return "not_member";
    }
}
