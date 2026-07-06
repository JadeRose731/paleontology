package com.chuanghai.paleo.cms.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.chuanghai.paleo.cms.domain.PaleoMembershipPayment;
import com.chuanghai.paleo.cms.mapper.PaleoMembershipPaymentMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import org.springframework.util.StringUtils;

import java.util.Calendar;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class PaleoMembershipPaymentService extends ServiceImpl<PaleoMembershipPaymentMapper, PaleoMembershipPayment> {

    @Autowired
    private PaleoMemberProfileService memberProfileService;

    @Autowired
    private PaleoRecognitionService recognitionService;

    /** 退会时作废历史缴费记录，避免重新入会沿用旧 CONFIRMED 状态 */
    public void voidPaymentsOnWithdraw(Long userId, String operator) {
        List<PaleoMembershipPayment> payments = list(new LambdaQueryWrapper<PaleoMembershipPayment>()
                .eq(PaleoMembershipPayment::getUserId, userId)
                .ne(PaleoMembershipPayment::getPaymentStatus, "VOIDED")
                .ne(PaleoMembershipPayment::getPaymentStatus, "UNPAID"));
        for (PaleoMembershipPayment payment : payments) {
            payment.setPaymentStatus("VOIDED");
            payment.setUpdateBy(operator);
            updateById(payment);
        }
    }

    public boolean attachFile(Long paymentId, String fileRole, String fileUrl, String operator) {
        PaleoMembershipPayment payment = getById(paymentId);
        if (payment == null) {
            return false;
        }
        if ("voucher".equals(fileRole)) {
            payment.setVoucherUrl(fileUrl);
            payment.setPaymentStatus("VOUCHER_REVIEW");
            payment.setReviewComment(null);
        } else if ("invoice".equals(fileRole)) {
            if (!"INVOICE_PENDING".equals(payment.getPaymentStatus()) && !"INVOICE_REJECTED".equals(payment.getPaymentStatus())) {
                throw new IllegalArgumentException("请先等待凭证初审通过后再上传发票");
            }
            payment.setInvoiceUrl(fileUrl);
            payment.setPaymentStatus("INVOICE_REVIEW");
            payment.setReviewComment(null);
        } else {
            throw new IllegalArgumentException("未知会员费文件类型: " + fileRole);
        }
        payment.setUpdateBy(operator);
        boolean updated = updateById(payment);
        if (updated) {
            recognitionService.recordMembershipUpload(payment, fileRole, fileUrl);
        }
        return updated;
    }

    public boolean review(Long paymentId, String paymentStatus, String reviewComment, String reviewer) {
        PaleoMembershipPayment payment = getById(paymentId);
        if (payment == null) {
            return false;
        }
        payment.setPaymentStatus(paymentStatus);
        payment.setReviewComment(reviewComment);
        payment.setUpdateBy(reviewer);
        boolean updated = updateById(payment);
        if (updated && "CONFIRMED".equals(paymentStatus)) {
            ensureValidDates(payment);
            memberProfileService.activateByPayment(payment, reviewer);
        }
        return updated;
    }

    /** Reuse an empty UNPAID draft instead of creating duplicate rows on each submit attempt. */
    public PaleoMembershipPayment getOrCreateDraft(PaleoMembershipPayment incoming, String operator) {
        PaleoMembershipPayment draft = getOne(new LambdaQueryWrapper<PaleoMembershipPayment>()
                .eq(PaleoMembershipPayment::getUserId, incoming.getUserId())
                .eq(PaleoMembershipPayment::getPaymentStatus, "UNPAID")
                .and(w -> w.isNull(PaleoMembershipPayment::getVoucherUrl)
                        .or().eq(PaleoMembershipPayment::getVoucherUrl, ""))
                .orderByDesc(PaleoMembershipPayment::getCreateTime)
                .last("LIMIT 1"));
        if (draft != null) {
            if (incoming.getMemberCategory() != null) {
                draft.setMemberCategory(incoming.getMemberCategory());
            }
            if (incoming.getAmount() != null) {
                draft.setAmount(incoming.getAmount());
            }
            if (incoming.getApplicationId() != null) {
                draft.setApplicationId(incoming.getApplicationId());
            }
            draft.setUpdateBy(operator);
            updateById(draft);
            return draft;
        }
        incoming.setPaymentId(null);
        incoming.setPaymentStatus("UNPAID");
        incoming.setCreateBy(operator);
        save(incoming);
        return incoming;
    }

    public boolean isDisplayable(PaleoMembershipPayment payment) {
        if (payment == null) {
            return false;
        }
        if ("UNPAID".equalsIgnoreCase(payment.getPaymentStatus())
                && !StringUtils.hasText(payment.getVoucherUrl())) {
            return false;
        }
        return true;
    }

    public List<PaleoMembershipPayment> listPendingReviews(String phase) {
        LambdaQueryWrapper<PaleoMembershipPayment> wrapper = new LambdaQueryWrapper<PaleoMembershipPayment>()
                .orderByDesc(PaleoMembershipPayment::getCreateTime);
        if ("invoice".equals(phase)) {
            wrapper.eq(PaleoMembershipPayment::getPaymentStatus, "INVOICE_REVIEW");
        } else {
            wrapper.eq(PaleoMembershipPayment::getPaymentStatus, "VOUCHER_REVIEW");
        }
        return list(wrapper);
    }

    private void ensureValidDates(PaleoMembershipPayment payment) {
        if (payment.getValidStartDate() == null) {
            payment.setValidStartDate(new Date());
        }
        if (payment.getValidEndDate() == null) {
            Calendar cal = Calendar.getInstance();
            cal.setTime(payment.getValidStartDate());
            cal.add(Calendar.YEAR, 1);
            payment.setValidEndDate(cal.getTime());
            updateById(payment);
        }
    }

    public Map<String, Object> getMembershipPaymentStats() {
        List<PaleoMembershipPayment> payments = list(new LambdaQueryWrapper<>());
        Map<String, Object> stats = new HashMap<>();
        Map<String, Long> countByCategory = new HashMap<>();
        Map<String, BigDecimal> amountByCategory = new HashMap<>();
        Map<String, Long> countByStatus = new HashMap<>();
        BigDecimal totalAmount = BigDecimal.ZERO;

        for (PaleoMembershipPayment payment : payments) {
            String category = normalize(payment.getMemberCategory());
            String status = normalize(payment.getPaymentStatus());
            BigDecimal amount = payment.getAmount() == null ? BigDecimal.ZERO : payment.getAmount();
            totalAmount = totalAmount.add(amount);
            countByCategory.put(category, countByCategory.getOrDefault(category, 0L) + 1);
            amountByCategory.put(category, amountByCategory.getOrDefault(category, BigDecimal.ZERO).add(amount));
            countByStatus.put(status, countByStatus.getOrDefault(status, 0L) + 1);
        }

        stats.put("paymentCount", payments.size());
        stats.put("totalMembershipAmount", totalAmount);
        stats.put("countByCategory", countByCategory);
        stats.put("amountByCategory", amountByCategory);
        stats.put("countByStatus", countByStatus);
        return stats;
    }

    private String normalize(String value) {
        return value == null || value.trim().isEmpty() ? "UNKNOWN" : value;
    }
}
