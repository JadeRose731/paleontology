package com.chuanghai.paleo.cms.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.chuanghai.paleo.cms.domain.PaleoMembershipApplication;
import com.chuanghai.paleo.cms.mapper.PaleoMembershipApplicationMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Date;
import java.util.List;

@Service
public class PaleoMembershipApplicationService extends ServiceImpl<PaleoMembershipApplicationMapper, PaleoMembershipApplication> {

    @Autowired
    private PaleoMemberProfileService memberProfileService;

    public boolean review(Long applicationId, String reviewStatus, String reviewComment, String reviewer) {
        PaleoMembershipApplication application = getById(applicationId);
        if (application == null) {
            return false;
        }
        if (!"PENDING".equals(application.getReviewStatus())) {
            throw new IllegalArgumentException("只有待审核申请可以审核");
        }
        application.setReviewStatus(reviewStatus);
        application.setReviewComment(reviewComment);
        application.setReviewer(reviewer);
        application.setReviewTime(new Date());
        application.setUpdateBy(reviewer);
        boolean updated = updateById(application);
        if (updated && "APPROVED".equals(reviewStatus)) {
            if ("WITHDRAW".equals(application.getApplicationType())) {
                memberProfileService.withdrawByApplication(application, reviewer);
            } else {
                memberProfileService.markPendingApplication(application, reviewer);
            }
        }
        return updated;
    }

    public boolean attachApplicationFile(Long applicationId, String fileUrl, String operator) {
        PaleoMembershipApplication application = getById(applicationId);
        if (application == null) {
            return false;
        }
        if (!"PENDING".equals(application.getReviewStatus())) {
            throw new IllegalArgumentException("只有待审核申请可以更新申请书");
        }
        application.setApplicationFileUrl(fileUrl);
        application.setUpdateBy(operator);
        return updateById(application);
    }

    public boolean cancelMine(Long userId, Long applicationId) {
        PaleoMembershipApplication application = getById(applicationId);
        if (application == null || !userId.equals(application.getUserId())) {
            return false;
        }
        if (!"PENDING".equals(application.getReviewStatus())) {
            throw new IllegalArgumentException("只有待审核申请可以撤回");
        }
        return removeById(applicationId);
    }

    public List<PaleoMembershipApplication> listPending(String applicationType) {
        return list(new LambdaQueryWrapper<PaleoMembershipApplication>()
                .eq(PaleoMembershipApplication::getReviewStatus, "PENDING")
                .eq(org.springframework.util.StringUtils.hasText(applicationType),
                        PaleoMembershipApplication::getApplicationType, applicationType)
                .orderByAsc(PaleoMembershipApplication::getCreateTime));
    }

    public PaleoMembershipApplication findPendingMine(Long userId, String applicationType) {
        return getOne(new LambdaQueryWrapper<PaleoMembershipApplication>()
                .eq(PaleoMembershipApplication::getUserId, userId)
                .eq(PaleoMembershipApplication::getApplicationType, applicationType)
                .eq(PaleoMembershipApplication::getReviewStatus, "PENDING")
                .orderByDesc(PaleoMembershipApplication::getCreateTime)
                .last("LIMIT 1"));
    }

    public PaleoMembershipApplication createMine(PaleoMembershipApplication application) {
        PaleoMembershipApplication pending = findPendingMine(application.getUserId(), application.getApplicationType());
        if (pending != null) {
            String label = "WITHDRAW".equals(application.getApplicationType()) ? "退会" : "入会";
            throw new IllegalArgumentException("已有待审核的" + label + "申请，请勿重复提交");
        }
        save(application);
        return application;
    }
}
