package com.chuanghai.paleo.cms.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.chuanghai.paleo.cms.domain.PaleoMemberProfile;
import com.chuanghai.paleo.cms.domain.PaleoMembershipApplication;
import com.chuanghai.paleo.cms.domain.PaleoMembershipPayment;
import com.chuanghai.paleo.cms.domain.PaleoUser;
import com.chuanghai.paleo.cms.domain.PaleoUserBinding;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class PaleoMembershipDirectoryService {

    @Autowired
    private PaleoUserService userService;

    @Autowired
    private PaleoMemberProfileService memberProfileService;

    @Autowired
    private PaleoMembershipPaymentService paymentService;

    @Autowired
    private PaleoMembershipApplicationService applicationService;

    @Autowired
    private com.chuanghai.paleo.cms.mapper.PaleoUserBindingMapper userBindingMapper;

    public List<Map<String, Object>> listDirectory() {
        List<PaleoUser> users = userService.list(new LambdaQueryWrapper<PaleoUser>()
                .eq(PaleoUser::getStatus, "1")
                .orderByDesc(PaleoUser::getCreateTime));
        if (users.isEmpty()) {
            return new ArrayList<>();
        }

        List<Long> userIds = users.stream().map(PaleoUser::getUserId).collect(Collectors.toList());

        Map<Long, PaleoMemberProfile> profileMap = memberProfileService.list(new LambdaQueryWrapper<PaleoMemberProfile>()
                        .in(PaleoMemberProfile::getUserId, userIds))
                .stream()
                .collect(Collectors.toMap(PaleoMemberProfile::getUserId, p -> p, (a, b) -> a));

        Map<Long, PaleoMembershipPayment> latestPaymentMap = new HashMap<>();
        for (PaleoMembershipPayment payment : paymentService.list(new LambdaQueryWrapper<PaleoMembershipPayment>()
                .in(PaleoMembershipPayment::getUserId, userIds)
                .orderByDesc(PaleoMembershipPayment::getCreateTime))) {
            latestPaymentMap.putIfAbsent(payment.getUserId(), payment);
        }

        Map<Long, PaleoMembershipApplication> pendingJoinMap = new HashMap<>();
        for (PaleoMembershipApplication app : applicationService.list(new LambdaQueryWrapper<PaleoMembershipApplication>()
                .in(PaleoMembershipApplication::getUserId, userIds)
                .eq(PaleoMembershipApplication::getApplicationType, "JOIN")
                .eq(PaleoMembershipApplication::getReviewStatus, "PENDING")
                .orderByDesc(PaleoMembershipApplication::getCreateTime))) {
            pendingJoinMap.putIfAbsent(app.getUserId(), app);
        }

        Map<Long, List<String>> branchMap = new HashMap<>();
        for (PaleoUserBinding binding : userBindingMapper.selectList(new LambdaQueryWrapper<PaleoUserBinding>()
                .in(PaleoUserBinding::getUserId, userIds)
                .eq(PaleoUserBinding::getBindingStatus, "BOUND"))) {
            branchMap.computeIfAbsent(binding.getUserId(), k -> new ArrayList<>())
                    .add(String.valueOf(binding.getAssociationId()));
        }

        SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd");
        List<Map<String, Object>> rows = new ArrayList<>();
        for (PaleoUser user : users) {
            PaleoMemberProfile profile = profileMap.get(user.getUserId());
            PaleoMembershipPayment latestPayment = latestPaymentMap.get(user.getUserId());
            PaleoMembershipApplication pendingJoin = pendingJoinMap.get(user.getUserId());

            Map<String, Object> row = new HashMap<>();
            row.put("userId", user.getUserId());
            row.put("email", user.getEmail());
            row.put("userName", user.getUserName());
            row.put("gender", user.getGender());
            row.put("unit", user.getUnit());
            row.put("roleLabel", user.getRoleLabel());
            row.put("userType", user.getUserType());
            row.put("memberStatus", profile != null ? profile.getMemberStatus() : "NON_MEMBER");
            row.put("memberCategory", profile != null ? profile.getMemberCategory() : null);
            row.put("membershipStatus", resolveMembershipStatus(profile, latestPayment, pendingJoin));
            if (profile != null && profile.getValidEndDate() != null) {
                row.put("validEndDate", dateFormat.format(profile.getValidEndDate()));
            }
            row.put("boundBranches", branchMap.getOrDefault(user.getUserId(), new ArrayList<>()));
            rows.add(row);
        }
        return rows;
    }

    private String resolveMembershipStatus(PaleoMemberProfile profile,
                                           PaleoMembershipPayment latestPayment,
                                           PaleoMembershipApplication pendingJoin) {
        if (pendingJoin != null) {
            return "application_submitted";
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
                    return "active";
                default:
                    break;
            }
        }
        if (profile != null && profile.getMemberStatus() != null) {
            switch (profile.getMemberStatus()) {
                case "ACTIVE":
                    return "active";
                case "PENDING":
                    return "application_approved";
                case "WITHDRAWN":
                    return "withdrawn";
                case "EXPIRED":
                    return "expired";
                case "NON_MEMBER":
                default:
                    return "not_member";
            }
        }
        return "not_member";
    }
}
