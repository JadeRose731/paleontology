package com.chuanghai.paleo.cms.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.chuanghai.paleo.cms.domain.PaleoConference;
import com.chuanghai.paleo.cms.domain.PaleoConferenceRegistration;
import com.chuanghai.paleo.cms.domain.PaleoUser;
import com.chuanghai.paleo.cms.mapper.PaleoConferenceMapper;
import com.chuanghai.paleo.cms.mapper.PaleoConferenceRegistrationMapper;
import com.chuanghai.paleo.cms.mapper.PaleoUserMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.util.Calendar;
import java.util.Date;
import java.util.List;

@Service
public class PaleoConferenceRegistrationService extends ServiceImpl<PaleoConferenceRegistrationMapper, PaleoConferenceRegistration> {

    @Autowired
    private PaleoConferenceMapper conferenceMapper;

    @Autowired
    private PaleoUserMapper userMapper;

    public PaleoConference findByCode(String conferenceCode) {
        if (!StringUtils.hasText(conferenceCode)) {
            return null;
        }
        return conferenceMapper.selectOne(new LambdaQueryWrapper<PaleoConference>()
                .eq(PaleoConference::getConferenceCode, conferenceCode)
                .last("LIMIT 1"));
    }

    public List<PaleoConferenceRegistration> listMine(Long userId) {
        List<PaleoConferenceRegistration> list = list(new LambdaQueryWrapper<PaleoConferenceRegistration>()
                .eq(PaleoConferenceRegistration::getUserId, userId)
                .orderByDesc(PaleoConferenceRegistration::getUpdateTime));
        list.forEach(this::enrichRegistration);
        return list;
    }

    public PaleoConferenceRegistration getMine(Long userId, Long registrationId) {
        PaleoConferenceRegistration reg = getById(registrationId);
        if (reg == null || !userId.equals(reg.getUserId())) {
            return null;
        }
        enrichRegistration(reg);
        return reg;
    }

    public PaleoConferenceRegistration getOrCreate(Long userId, String conferenceCode, String feeType,
                                                   BigDecimal feeAmount, String operator) {
        PaleoConference conference = findByCode(conferenceCode);
        if (conference == null) {
            throw new IllegalArgumentException("会议不存在或未开放线上报名：" + conferenceCode);
        }
        if (!"OPEN".equals(conference.getStatus())) {
            throw new IllegalArgumentException("该会议当前未开放报名");
        }

        PaleoConferenceRegistration existing = getOne(new LambdaQueryWrapper<PaleoConferenceRegistration>()
                .eq(PaleoConferenceRegistration::getUserId, userId)
                .eq(PaleoConferenceRegistration::getConferenceId, conference.getConferenceId())
                .orderByDesc(PaleoConferenceRegistration::getRegistrationId)
                .last("LIMIT 1"));

        if (existing != null) {
            if ("CONFIRMED".equals(existing.getPaymentStatus())) {
                throw new IllegalArgumentException("您已完成该会议报名");
            }
            enrichRegistration(existing);
            return existing;
        }

        PaleoConferenceRegistration reg = new PaleoConferenceRegistration();
        reg.setConferenceId(conference.getConferenceId());
        reg.setAssociationId(conference.getAssociationId());
        reg.setUserId(userId);
        reg.setFeeType(feeType);
        reg.setFeeAmount(feeAmount);
        reg.setPaymentStatus("UNPAID");
        reg.setCreateBy(operator);
        reg.setUpdateBy(operator);
        save(reg);
        enrichRegistration(reg);
        return reg;
    }

    public boolean attachFile(Long registrationId, String fileRole, String fileUrl, String operator) {
        PaleoConferenceRegistration reg = getById(registrationId);
        if (reg == null) {
            return false;
        }
        Date now = new Date();
        if ("voucher".equals(fileRole)) {
            reg.setVoucherUrl(fileUrl);
            reg.setVoucherSubmitTime(now);
            reg.setPaymentStatus("VOUCHER_REVIEW");
            reg.setReviewComment(null);
        } else if ("invoice".equals(fileRole)) {
            if (!"INVOICE_PENDING".equals(reg.getPaymentStatus()) && !"INVOICE_REJECTED".equals(reg.getPaymentStatus())) {
                throw new IllegalArgumentException("请先等待凭证初审通过后再上传发票");
            }
            reg.setInvoiceUrl(fileUrl);
            reg.setInvoiceSubmitTime(now);
            reg.setPaymentStatus("INVOICE_REVIEW");
            reg.setReviewComment(null);
        } else {
            throw new IllegalArgumentException("未知会议费文件类型: " + fileRole);
        }
        reg.setUpdateBy(operator);
        return updateById(reg);
    }

    public boolean review(Long registrationId, String paymentStatus, String reviewComment, String reviewer) {
        PaleoConferenceRegistration reg = getById(registrationId);
        if (reg == null) {
            return false;
        }
        Date now = new Date();
        reg.setPaymentStatus(paymentStatus);
        reg.setReviewComment(reviewComment);
        reg.setUpdateBy(reviewer);

        if ("INVOICE_PENDING".equals(paymentStatus)) {
            reg.setVoucherAuditTime(now);
            reg.setInvoiceDeadline(addWorkdays(now, 7));
        } else if ("VOUCHER_REJECTED".equals(paymentStatus)) {
            reg.setVoucherAuditTime(now);
        } else if ("CONFIRMED".equals(paymentStatus)) {
            reg.setInvoiceAuditTime(now);
        } else if ("INVOICE_REJECTED".equals(paymentStatus)) {
            reg.setInvoiceAuditTime(now);
        }

        return updateById(reg);
    }

    public List<PaleoConferenceRegistration> listPendingReviews(String phase) {
        LambdaQueryWrapper<PaleoConferenceRegistration> wrapper = new LambdaQueryWrapper<PaleoConferenceRegistration>()
                .orderByAsc(PaleoConferenceRegistration::getVoucherSubmitTime)
                .orderByAsc(PaleoConferenceRegistration::getInvoiceSubmitTime);
        if ("invoice".equals(phase)) {
            wrapper.eq(PaleoConferenceRegistration::getPaymentStatus, "INVOICE_REVIEW");
        } else {
            wrapper.eq(PaleoConferenceRegistration::getPaymentStatus, "VOUCHER_REVIEW");
        }
        List<PaleoConferenceRegistration> list = list(wrapper);
        list.forEach(this::enrichRegistration);
        return list;
    }

    public void enrichRegistration(PaleoConferenceRegistration reg) {
        if (reg == null) {
            return;
        }
        PaleoConference conference = conferenceMapper.selectById(reg.getConferenceId());
        if (conference != null) {
            reg.setConferenceCode(conference.getConferenceCode());
            reg.setConferenceTitle(conference.getConferenceTitle());
        }
        PaleoUser user = userMapper.selectById(reg.getUserId());
        if (user != null) {
            reg.setUserEmail(user.getEmail());
            reg.setUserName(user.getUserName());
        }
    }

    private Date addWorkdays(Date start, int workdays) {
        Calendar cal = Calendar.getInstance();
        cal.setTime(start);
        int added = 0;
        while (added < workdays) {
            cal.add(Calendar.DAY_OF_MONTH, 1);
            int day = cal.get(Calendar.DAY_OF_WEEK);
            if (day != Calendar.SUNDAY && day != Calendar.SATURDAY) {
                added++;
            }
        }
        return cal.getTime();
    }
}
