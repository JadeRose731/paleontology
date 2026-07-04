package com.chuanghai.paleo.cms.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.chuanghai.paleo.cms.domain.*;
import com.chuanghai.paleo.cms.mapper.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.*;

@Service
public class PaleoDashboardService {

    @Autowired
    private PaleoMemberProfileMapper memberProfileMapper;
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

        List<PaleoMemberProfile> profiles = memberProfileMapper.selectList(new LambdaQueryWrapper<>());
        List<PaleoUserBinding> bindings = userBindingMapper.selectList(new LambdaQueryWrapper<>());

        long totalUsers = profiles.size();
        long memberCount = profiles.stream().filter(p -> "ACTIVE".equals(p.getMemberStatus())).count();
        long nonMemberCount = totalUsers - memberCount;

        long studentMembers = profiles.stream()
                .filter(p -> "ACTIVE".equals(p.getMemberStatus()) && "student_member".equals(p.getMemberCategory()))
                .count();
        long nonStudentMembers = profiles.stream()
                .filter(p -> "ACTIVE".equals(p.getMemberStatus()) && "non_student_member".equals(p.getMemberCategory()))
                .count();
        long studentNonMembers = profiles.stream()
                .filter(p -> !"ACTIVE".equals(p.getMemberStatus()) && "student_member".equals(p.getMemberCategory()))
                .count();
        long nonStudentNonMembers = totalUsers - studentMembers - nonStudentMembers - studentNonMembers;

        result.put("totalUsers", totalUsers);
        result.put("memberCount", memberCount);
        result.put("nonMemberCount", nonMemberCount);
        result.put("activeMembers", memberCount);
        result.put("studentMembers", studentMembers);
        result.put("nonStudentMembers", nonStudentMembers);
        result.put("studentNonMembers", studentNonMembers);
        result.put("nonStudentNonMembers", nonStudentNonMembers);

        List<PaleoMembershipPayment> payments = paymentMapper.selectList(new LambdaQueryWrapper<>());
        BigDecimal totalMembershipFee = payments.stream()
                .filter(p -> "CONFIRMED".equals(p.getPaymentStatus()))
                .map(p -> p.getAmount() == null ? BigDecimal.ZERO : p.getAmount())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        result.put("totalMembershipFee", totalMembershipFee);

        List<PaleoConference> conferences = conferenceMapper.selectList(new LambdaQueryWrapper<>());
        long activeConferences = conferences.stream().filter(c -> "OPEN".equals(c.getStatus())).count();
        result.put("activeConferences", activeConferences);
        result.put("totalConferences", conferences.size());

        List<PaleoConferenceRegistration> registrations = registrationMapper.selectList(new LambdaQueryWrapper<>());
        BigDecimal totalConferenceFee = registrations.stream()
                .filter(r -> "CONFIRMED".equals(r.getPaymentStatus()))
                .map(r -> r.getFeeAmount() == null ? BigDecimal.ZERO : r.getFeeAmount())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        result.put("totalConferenceFee", totalConferenceFee);

        List<PaleoAssociation> associations = associationMapper.selectList(
                new LambdaQueryWrapper<PaleoAssociation>().orderByAsc(PaleoAssociation::getSortOrder));

        List<Map<String, Object>> branchMemberCounts = new ArrayList<>();
        for (PaleoAssociation assoc : associations) {
            long count = bindings.stream()
                    .filter(b -> assoc.getAssociationId().equals(b.getAssociationId()) && "BOUND".equals(b.getBindingStatus()))
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
