package com.chuanghai.paleo.cms.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.chuanghai.paleo.cms.common.AuditAction;
import com.chuanghai.paleo.cms.domain.PaleoConferenceRegistration;
import com.chuanghai.paleo.cms.domain.PaleoMembershipPayment;
import com.chuanghai.paleo.cms.domain.PaleoRecognitionResult;
import com.chuanghai.paleo.cms.domain.PaleoUser;
import com.chuanghai.paleo.cms.domain.PaleoUserBinding;
import com.chuanghai.paleo.cms.mapper.PaleoRecognitionResultMapper;
import com.chuanghai.paleo.cms.mapper.PaleoUserBindingMapper;
import com.chuanghai.paleo.cms.mapper.PaleoUserMapper;
import com.chuanghai.paleo.cms.security.AdminAccessDeniedException;
import com.chuanghai.paleo.cms.security.LoginUser;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class PaleoRecognitionService extends ServiceImpl<PaleoRecognitionResultMapper, PaleoRecognitionResult> {

    @Autowired
    private AdminScopeService adminScopeService;

    @Autowired
    private AuditLogService auditLogService;

    @Autowired
    private PaleoUserMapper userMapper;

    @Autowired
    private PaleoUserBindingMapper userBindingMapper;

    @Autowired
    private ObjectMapper objectMapper;

    public PaleoRecognitionResult recordMembershipUpload(PaleoMembershipPayment payment, String fileRole, String fileUrl) {
        if (payment == null || !StringUtils.hasText(fileUrl)) {
            return null;
        }
        PaleoRecognitionResult result = new PaleoRecognitionResult();
        result.setTargetType("membership");
        result.setTargetId(payment.getPaymentId());
        result.setUserId(payment.getUserId());
        result.setAssociationId(null);
        result.setFileRole(fileRole);
        result.setFileUrl(fileUrl);
        result.setAutoStatus("pending");
        result.setCreateTime(new Date());
        save(result);
        runMockRecognition(result, payment.getAmount(), fileRole);
        updateById(result);
        return result;
    }

    public PaleoRecognitionResult recordConferenceUpload(PaleoConferenceRegistration reg, String fileRole, String fileUrl) {
        if (reg == null || !StringUtils.hasText(fileUrl)) {
            return null;
        }
        PaleoRecognitionResult result = new PaleoRecognitionResult();
        result.setTargetType("conference");
        result.setTargetId(reg.getRegistrationId());
        result.setUserId(reg.getUserId());
        result.setAssociationId(reg.getAssociationId());
        result.setFileRole(fileRole);
        result.setFileUrl(fileUrl);
        result.setAutoStatus("pending");
        result.setCreateTime(new Date());
        save(result);
        runMockRecognition(result, reg.getFeeAmount(), fileRole);
        updateById(result);
        return result;
    }

    private void runMockRecognition(PaleoRecognitionResult result, BigDecimal expectedAmount, String fileRole) {
        try {
            Map<String, Object> detail = new LinkedHashMap<>();
            BigDecimal extracted = expectedAmount != null ? expectedAmount : BigDecimal.ZERO;
            detail.put("extractedAmount", extracted);
            detail.put("expectedAmount", expectedAmount);
            detail.put("amountMatch", true);
            detail.put("fileRole", fileRole);
            String note = "voucher".equals(fileRole)
                    ? "智能审核：凭证金额与锁定费用一致，已自动通过识别"
                    : "智能审核：发票信息与凭证一致，已自动通过识别";
            detail.put("note", note);
            result.setAutoStatus("passed");
            result.setAutoDetail(objectMapper.writeValueAsString(detail));
        } catch (Exception ex) {
            result.setAutoStatus("failed");
            result.setAutoDetail("{\"error\":\"识别模拟失败\"}");
        }
    }

    public Page<Map<String, Object>> listForAdmin(LoginUser user, int pageNum, int pageSize,
                                                   String status, String targetType, String manualStatus) {
        LambdaQueryWrapper<PaleoRecognitionResult> wrapper = scopeWrapper(user)
                .orderByDesc(PaleoRecognitionResult::getCreateTime);

        if (StringUtils.hasText(status)) {
            wrapper.eq(PaleoRecognitionResult::getAutoStatus, status.trim());
        }
        if (StringUtils.hasText(targetType)) {
            wrapper.eq(PaleoRecognitionResult::getTargetType, targetType.trim());
        }
        if (StringUtils.hasText(manualStatus)) {
            if ("none".equalsIgnoreCase(manualStatus)) {
                wrapper.isNull(PaleoRecognitionResult::getManualStatus);
            } else {
                wrapper.eq(PaleoRecognitionResult::getManualStatus, manualStatus.trim());
            }
        }

        Page<PaleoRecognitionResult> page = page(new Page<>(pageNum, pageSize), wrapper);
        List<Map<String, Object>> rows = enrichRows(page.getRecords());

        Page<Map<String, Object>> result = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        result.setRecords(rows);
        return result;
    }

    public Map<String, Object> getDetailForAdmin(LoginUser user, Long resultId) {
        PaleoRecognitionResult result = getById(resultId);
        if (result == null) {
            throw new AdminAccessDeniedException("识别记录不存在");
        }
        assertCanAccess(user, result);
        List<Map<String, Object>> rows = enrichRows(Collections.singletonList(result));
        return rows.isEmpty() ? new HashMap<String, Object>() : rows.get(0);
    }

    public boolean manualReview(LoginUser reviewer, Long resultId, String manualStatus, String manualComment) {
        PaleoRecognitionResult result = getById(resultId);
        if (result == null) {
            return false;
        }
        assertCanAccess(reviewer, result);
        if (!"confirmed".equals(manualStatus) && !"disputed".equals(manualStatus)) {
            throw new IllegalArgumentException("manualStatus 仅支持 confirmed / disputed");
        }

        result.setManualStatus(manualStatus);
        result.setManualComment(manualComment);
        result.setReviewedBy(reviewer.getUserId());
        result.setReviewedAt(new Date());
        boolean updated = updateById(result);

        if (updated) {
            String label = "confirmed".equals(manualStatus) ? "确认无误" : "存疑";
            Map<String, Object> reviewDetail = new LinkedHashMap<>();
            reviewDetail.put("manualStatus", manualStatus);
            reviewDetail.put("manualComment", manualComment != null ? manualComment : "");
            auditLogService.log(reviewer, AuditAction.RECOGNITION_MANUAL_REVIEW, "recognition",
                    String.valueOf(resultId), result.getAssociationId(),
                    String.format("识别结果人工复核：%s（%s/%s）", label, result.getTargetType(), result.getFileRole()),
                    reviewDetail);
        }
        return updated;
    }

    public void assertCanAccess(LoginUser user, PaleoRecognitionResult result) {
        if (user == null) {
            throw new AdminAccessDeniedException("未登录");
        }
        if (adminScopeService.isSuperAdmin(user)) {
            return;
        }
        if (!adminScopeService.isBranchAdmin(user)) {
            throw new AdminAccessDeniedException("无权访问识别结果");
        }
        if ("conference".equals(result.getTargetType())) {
            adminScopeService.assertCanAccessAssociationId(user, result.getAssociationId());
            return;
        }
        if ("membership".equals(result.getTargetType())) {
            List<Long> accessible = adminScopeService.resolveAccessibleAssociationIds(user);
            Set<Long> userAssocIds = userBindingMapper.selectList(new LambdaQueryWrapper<PaleoUserBinding>()
                            .eq(PaleoUserBinding::getUserId, result.getUserId())
                            .eq(PaleoUserBinding::getBindingStatus, "BOUND"))
                    .stream()
                    .map(PaleoUserBinding::getAssociationId)
                    .collect(Collectors.toSet());
            boolean inScope = false;
            for (Long assocId : accessible) {
                if (userAssocIds.contains(assocId)) {
                    inScope = true;
                    break;
                }
            }
            if (!inScope) {
                throw new AdminAccessDeniedException("无权访问该识别记录");
            }
            return;
        }
        throw new AdminAccessDeniedException("无权访问识别结果");
    }

    private LambdaQueryWrapper<PaleoRecognitionResult> scopeWrapper(LoginUser user) {
        LambdaQueryWrapper<PaleoRecognitionResult> wrapper = new LambdaQueryWrapper<>();
        if (user == null || adminScopeService.isSuperAdmin(user)) {
            return wrapper;
        }
        if (!adminScopeService.isBranchAdmin(user)) {
            wrapper.eq(PaleoRecognitionResult::getResultId, -1L);
            return wrapper;
        }

        List<Long> accessible = adminScopeService.resolveAccessibleAssociationIds(user);
        if (accessible.isEmpty()) {
            wrapper.eq(PaleoRecognitionResult::getResultId, -1L);
            return wrapper;
        }

        Set<Long> userIdsInScope = new HashSet<>();
        List<PaleoUserBinding> bindings = userBindingMapper.selectList(new LambdaQueryWrapper<PaleoUserBinding>()
                .in(PaleoUserBinding::getAssociationId, accessible)
                .eq(PaleoUserBinding::getBindingStatus, "BOUND"));
        for (PaleoUserBinding binding : bindings) {
            userIdsInScope.add(binding.getUserId());
        }

        wrapper.and(w -> {
            w.in(PaleoRecognitionResult::getAssociationId, accessible);
            if (!userIdsInScope.isEmpty()) {
                w.or(sub -> sub.eq(PaleoRecognitionResult::getTargetType, "membership")
                        .in(PaleoRecognitionResult::getUserId, userIdsInScope));
            }
        });
        return wrapper;
    }

    private List<Map<String, Object>> enrichRows(List<PaleoRecognitionResult> records) {
        List<Map<String, Object>> rows = new ArrayList<>();
        for (PaleoRecognitionResult r : records) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("resultId", r.getResultId());
            row.put("targetType", r.getTargetType());
            row.put("targetId", r.getTargetId());
            row.put("userId", r.getUserId());
            row.put("associationId", r.getAssociationId());
            row.put("fileRole", r.getFileRole());
            row.put("fileUrl", r.getFileUrl());
            row.put("autoStatus", r.getAutoStatus());
            row.put("autoDetail", r.getAutoDetail());
            row.put("manualStatus", r.getManualStatus());
            row.put("manualComment", r.getManualComment());
            row.put("reviewedBy", r.getReviewedBy());
            row.put("reviewedAt", r.getReviewedAt());
            row.put("createTime", r.getCreateTime());

            PaleoUser user = userMapper.selectById(r.getUserId());
            if (user != null) {
                row.put("userEmail", user.getEmail());
                row.put("userName", user.getUserName());
            }
            if (r.getFileUrl() != null) {
                int slash = Math.max(r.getFileUrl().lastIndexOf('/'), r.getFileUrl().lastIndexOf('\\'));
                row.put("fileName", slash >= 0 ? r.getFileUrl().substring(slash + 1) : r.getFileUrl());
            }
            rows.add(row);
        }
        return rows;
    }
}
