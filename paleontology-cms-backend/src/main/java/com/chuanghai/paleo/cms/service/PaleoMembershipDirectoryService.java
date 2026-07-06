package com.chuanghai.paleo.cms.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.chuanghai.paleo.cms.domain.PaleoAssociation;
import com.chuanghai.paleo.cms.domain.PaleoMemberProfile;
import com.chuanghai.paleo.cms.domain.PaleoMembershipApplication;
import com.chuanghai.paleo.cms.domain.PaleoMembershipPayment;
import com.chuanghai.paleo.cms.domain.PaleoUser;
import com.chuanghai.paleo.cms.domain.PaleoUserBinding;
import com.chuanghai.paleo.cms.mapper.PaleoAssociationMapper;
import com.chuanghai.paleo.cms.security.LoginUser;
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
    private PaleoAssociationMapper associationMapper;

    @Autowired
    private PaleoMemberProfileService memberProfileService;

    @Autowired
    private PaleoMembershipPaymentService paymentService;

    @Autowired
    private PaleoMembershipApplicationService applicationService;

    @Autowired
    private com.chuanghai.paleo.cms.mapper.PaleoUserBindingMapper userBindingMapper;

    @Autowired
    private AdminScopeService adminScopeService;

    @Autowired
    private PaleoMembershipStatusService membershipStatusService;

    public List<Map<String, Object>> listDirectory() {
        return listDirectoryForAdmin(null);
    }

    public List<Map<String, Object>> listDirectoryForAdmin(LoginUser user) {
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
                .ne(PaleoMembershipPayment::getPaymentStatus, "VOIDED")
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

        Map<Long, String> associationNames = associationMapper.selectList(new LambdaQueryWrapper<PaleoAssociation>()
                        .orderByAsc(PaleoAssociation::getSortOrder))
                .stream()
                .collect(Collectors.toMap(PaleoAssociation::getAssociationId,
                        PaleoAssociation::getAssociationName, (a, b) -> a));

        Map<Long, List<String>> branchCodeMap = new HashMap<>();
        Map<Long, List<String>> branchNameMap = new HashMap<>();
        Map<Long, String> assocBranchCodes = associationMapper.selectList(new LambdaQueryWrapper<PaleoAssociation>()
                        .isNotNull(PaleoAssociation::getBranchCode))
                .stream()
                .collect(Collectors.toMap(PaleoAssociation::getAssociationId,
                        PaleoAssociation::getBranchCode, (a, b) -> a));
        for (PaleoUserBinding binding : userBindingMapper.selectList(new LambdaQueryWrapper<PaleoUserBinding>()
                .in(PaleoUserBinding::getUserId, userIds)
                .eq(PaleoUserBinding::getBindingStatus, "BOUND"))) {
            Long assocId = binding.getAssociationId();
            String code = assocBranchCodes.get(assocId);
            if (code == null || "zgswxh".equals(code)) {
                continue;
            }
            String name = associationNames.getOrDefault(assocId, code);
            branchCodeMap.computeIfAbsent(binding.getUserId(), k -> new ArrayList<>()).add(code);
            branchNameMap.computeIfAbsent(binding.getUserId(), k -> new ArrayList<>()).add(name);
        }

        SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd");
        List<Map<String, Object>> rows = new ArrayList<>();
        List<Long> scopeAssociationIds = user != null && adminScopeService.isBranchAdmin(user)
                ? adminScopeService.resolveAccessibleAssociationIds(user)
                : null;

        for (PaleoUser userRow : users) {
            if (scopeAssociationIds != null) {
                List<String> userBranches = branchCodeMap.getOrDefault(userRow.getUserId(), new ArrayList<>());
                boolean inScope = false;
                for (Long assocId : scopeAssociationIds) {
                    String code = assocBranchCodes.get(assocId);
                    if (code != null && userBranches.contains(code)) {
                        inScope = true;
                        break;
                    }
                }
                if (!inScope) {
                    continue;
                }
            }
            PaleoMemberProfile profile = profileMap.get(userRow.getUserId());
            PaleoMembershipPayment latestPayment = latestPaymentMap.get(userRow.getUserId());
            PaleoMembershipApplication pendingJoin = pendingJoinMap.get(userRow.getUserId());

            Map<String, Object> row = new HashMap<>();
            row.put("userId", userRow.getUserId());
            row.put("email", userRow.getEmail());
            row.put("userName", userRow.getUserName());
            row.put("gender", userRow.getGender());
            row.put("unit", userRow.getUnit());
            row.put("roleLabel", userRow.getRoleLabel());
            row.put("userType", userRow.getUserType());
            row.put("memberStatus", profile != null ? profile.getMemberStatus() : "NON_MEMBER");
            row.put("memberCategory", profile != null ? profile.getMemberCategory() : null);
            row.put("membershipStatus", membershipStatusService.resolveMembershipStatus(profile, latestPayment, pendingJoin));
            if (profile != null && profile.getValidEndDate() != null) {
                row.put("validEndDate", dateFormat.format(profile.getValidEndDate()));
            }
            row.put("boundBranches", branchCodeMap.getOrDefault(userRow.getUserId(), new ArrayList<>()));
            row.put("boundBranchNames", branchNameMap.getOrDefault(userRow.getUserId(), new ArrayList<>()));
            rows.add(row);
        }
        return rows;
    }
}
