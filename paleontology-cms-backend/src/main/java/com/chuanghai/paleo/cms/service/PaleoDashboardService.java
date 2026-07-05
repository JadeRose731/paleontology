package com.chuanghai.paleo.cms.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.chuanghai.paleo.cms.domain.PaleoAssociation;
import com.chuanghai.paleo.cms.domain.PaleoConference;
import com.chuanghai.paleo.cms.domain.PaleoConferenceRegistration;
import com.chuanghai.paleo.cms.domain.PaleoMembershipPayment;
import com.chuanghai.paleo.cms.domain.PaleoUser;
import com.chuanghai.paleo.cms.domain.PaleoUserBinding;
import com.chuanghai.paleo.cms.mapper.PaleoAssociationMapper;
import com.chuanghai.paleo.cms.mapper.PaleoConferenceMapper;
import com.chuanghai.paleo.cms.mapper.PaleoConferenceRegistrationMapper;
import com.chuanghai.paleo.cms.mapper.PaleoMembershipPaymentMapper;
import com.chuanghai.paleo.cms.mapper.PaleoUserBindingMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class PaleoDashboardService {

    @Autowired
    private PaleoUserService userService;

    @Autowired
    private PaleoMembershipDirectoryService directoryService;

    @Autowired
    private PaleoUserBindingMapper userBindingMapper;

    @Autowired
    private PaleoMembershipPaymentMapper paymentMapper;

    @Autowired
    private PaleoConferenceMapper conferenceMapper;

    @Autowired
    private PaleoConferenceRegistrationMapper registrationMapper;

    @Autowired
    private PaleoAssociationMapper associationMapper;

    public Map<String, Object> getDashboardStats() {
        Map<String, Object> result = new HashMap<>();

        List<Map<String, Object>> directory = directoryService.listDirectory();
        Set<Long> realUserIds = userService.list(new LambdaQueryWrapper<PaleoUser>()
                        .eq(PaleoUser::getStatus, "1"))
                .stream()
                .map(PaleoUser::getUserId)
                .collect(Collectors.toSet());

        long totalUsers = directory.size();
        long memberCount = directory.stream()
                .filter(row -> "member".equals(String.valueOf(row.get("userType"))))
                .count();
        long nonMemberCount = directory.stream()
                .filter(row -> "non_member".equals(String.valueOf(row.get("userType"))))
                .count();
        long activeMembers = directory.stream()
                .filter(row -> "member".equals(String.valueOf(row.get("userType")))
                        && "active".equals(String.valueOf(row.get("membershipStatus"))))
                .count();

        long studentMembers = 0;
        long nonStudentMembers = 0;
        long studentNonMembers = 0;
        long nonStudentNonMembers = 0;

        for (Map<String, Object> row : directory) {
            boolean isStudent = "学生".equals(String.valueOf(row.get("roleLabel")));
            String userType = String.valueOf(row.get("userType"));
            String membershipStatus = String.valueOf(row.get("membershipStatus"));

            if ("member".equals(userType) && "active".equals(membershipStatus)) {
                if (isStudent) {
                    studentMembers++;
                } else {
                    nonStudentMembers++;
                }
            } else if ("non_member".equals(userType)) {
                if (isStudent) {
                    studentNonMembers++;
                } else {
                    nonStudentNonMembers++;
                }
            }
        }

        result.put("totalUsers", totalUsers);
        result.put("memberCount", memberCount);
        result.put("nonMemberCount", nonMemberCount);
        result.put("activeMembers", activeMembers);
        result.put("studentMembers", studentMembers);
        result.put("nonStudentMembers", nonStudentMembers);
        result.put("studentNonMembers", studentNonMembers);
        result.put("nonStudentNonMembers", nonStudentNonMembers);

        List<PaleoMembershipPayment> payments = realUserIds.isEmpty()
                ? new ArrayList<>()
                : paymentMapper.selectList(new LambdaQueryWrapper<PaleoMembershipPayment>()
                .in(PaleoMembershipPayment::getUserId, realUserIds));
        BigDecimal totalMembershipFee = BigDecimal.ZERO;
        BigDecimal studentMembershipFeeAmount = BigDecimal.ZERO;
        BigDecimal nonStudentMembershipFeeAmount = BigDecimal.ZERO;

        for (PaleoMembershipPayment payment : payments) {
            if (!"CONFIRMED".equals(payment.getPaymentStatus())) {
                continue;
            }
            BigDecimal amount = payment.getAmount() == null ? BigDecimal.ZERO : payment.getAmount();
            totalMembershipFee = totalMembershipFee.add(amount);
            if ("student_member".equals(payment.getMemberCategory())) {
                studentMembershipFeeAmount = studentMembershipFeeAmount.add(amount);
            } else {
                nonStudentMembershipFeeAmount = nonStudentMembershipFeeAmount.add(amount);
            }
        }

        result.put("totalMembershipFee", totalMembershipFee);
        result.put("studentMembershipFeeAmount", studentMembershipFeeAmount);
        result.put("nonStudentMembershipFeeAmount", nonStudentMembershipFeeAmount);

        List<PaleoConference> conferences = conferenceMapper.selectList(new LambdaQueryWrapper<>());
        long activeConferences = conferences.stream().filter(c -> "OPEN".equals(c.getStatus())).count();
        result.put("activeConferences", activeConferences);
        result.put("totalConferences", conferences.size());

        List<PaleoConferenceRegistration> registrations = realUserIds.isEmpty()
                ? new ArrayList<>()
                : registrationMapper.selectList(
                new LambdaQueryWrapper<PaleoConferenceRegistration>()
                        .in(PaleoConferenceRegistration::getUserId, realUserIds));
        BigDecimal totalConferenceFee = registrations.stream()
                .filter(r -> "CONFIRMED".equals(r.getPaymentStatus()))
                .map(r -> r.getFeeAmount() == null ? BigDecimal.ZERO : r.getFeeAmount())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        result.put("totalConferenceFee", totalConferenceFee);

        List<PaleoAssociation> associations = associationMapper.selectList(
                new LambdaQueryWrapper<PaleoAssociation>().orderByAsc(PaleoAssociation::getSortOrder));
        List<PaleoUserBinding> bindings = realUserIds.isEmpty()
                ? new ArrayList<>()
                : userBindingMapper.selectList(new LambdaQueryWrapper<PaleoUserBinding>()
                .in(PaleoUserBinding::getUserId, realUserIds)
                .eq(PaleoUserBinding::getBindingStatus, "BOUND"));

        List<Map<String, Object>> branchMemberCounts = new ArrayList<>();
        for (PaleoAssociation assoc : associations) {
            long count = bindings.stream()
                    .filter(b -> assoc.getAssociationId().equals(b.getAssociationId()))
                    .count();
            Map<String, Object> item = new HashMap<>();
            item.put("name", assoc.getAssociationName());
            item.put("count", count);
            branchMemberCounts.add(item);
        }
        branchMemberCounts.sort((a, b) -> Long.compare((long) b.get("count"), (long) a.get("count")));
        result.put("branchMemberCounts", branchMemberCounts);

        Map<String, Object> perSocietyConferenceFee = new HashMap<>();
        for (PaleoAssociation assoc : associations) {
            BigDecimal fee = registrations.stream()
                    .filter(r -> assoc.getAssociationId().equals(r.getAssociationId()) && "CONFIRMED".equals(r.getPaymentStatus()))
                    .map(r -> r.getFeeAmount() == null ? BigDecimal.ZERO : r.getFeeAmount())
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            perSocietyConferenceFee.put(assoc.getAssociationName(), fee);
        }
        result.put("perSocietyConferenceFee", perSocietyConferenceFee);

        long pendingPayments = payments.stream()
                .filter(p -> "VOUCHER_REVIEW".equals(p.getPaymentStatus()))
                .count();
        result.put("pendingReviews", pendingPayments);

        return result;
    }
}
