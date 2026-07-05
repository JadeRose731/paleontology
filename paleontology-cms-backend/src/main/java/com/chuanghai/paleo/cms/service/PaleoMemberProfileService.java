package com.chuanghai.paleo.cms.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.chuanghai.paleo.cms.domain.PaleoMemberProfile;
import com.chuanghai.paleo.cms.domain.PaleoMembershipApplication;
import com.chuanghai.paleo.cms.domain.PaleoMembershipPayment;
import com.chuanghai.paleo.cms.mapper.PaleoMemberProfileMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Calendar;
import java.util.Date;
import java.util.List;

@Service
public class PaleoMemberProfileService extends ServiceImpl<PaleoMemberProfileMapper, PaleoMemberProfile> {

    @Autowired
    private PaleoUserService userService;

    public PaleoMemberProfile getOrCreate(Long userId, String operator) {
        PaleoMemberProfile profile = getOne(new LambdaQueryWrapper<PaleoMemberProfile>()
                .eq(PaleoMemberProfile::getUserId, userId)
                .last("LIMIT 1"));
        if (profile != null) {
            refreshExpiredStatus(profile, operator);
            return profile;
        }
        PaleoMemberProfile created = new PaleoMemberProfile();
        created.setUserId(userId);
        created.setMemberStatus("NON_MEMBER");
        created.setCreateBy(operator);
        save(created);
        return created;
    }

    public void activateByPayment(PaleoMembershipPayment payment, String operator) {
        PaleoMemberProfile profile = getOrCreate(payment.getUserId(), operator);
        profile.setMemberStatus("ACTIVE");
        profile.setMemberCategory(payment.getMemberCategory());
        profile.setValidStartDate(payment.getValidStartDate() != null ? payment.getValidStartDate() : new Date());
        if (payment.getValidEndDate() != null) {
            profile.setValidEndDate(payment.getValidEndDate());
        } else {
            Calendar cal = Calendar.getInstance();
            cal.setTime(profile.getValidStartDate());
            cal.add(Calendar.YEAR, 1);
            profile.setValidEndDate(cal.getTime());
        }
        profile.setLatestApplicationId(payment.getApplicationId());
        profile.setLatestPaymentId(payment.getPaymentId());
        profile.setUpdateBy(operator);
        updateById(profile);
        userService.updateUserType(payment.getUserId(), "member", true, operator);
    }

    public void withdrawByApplication(PaleoMembershipApplication application, String operator) {
        PaleoMemberProfile profile = getOrCreate(application.getUserId(), operator);
        profile.setMemberStatus("WITHDRAWN");
        profile.setLatestApplicationId(application.getApplicationId());
        profile.setUpdateBy(operator);
        updateById(profile);
        userService.updateUserType(application.getUserId(), "non_member", true, operator);
    }

    public void markPendingApplication(PaleoMembershipApplication application, String operator) {
        PaleoMemberProfile profile = getOrCreate(application.getUserId(), operator);
        if (!"ACTIVE".equals(profile.getMemberStatus())) {
            profile.setMemberStatus("PENDING");
        }
        profile.setMemberCategory(application.getMemberCategory());
        profile.setLatestApplicationId(application.getApplicationId());
        profile.setUpdateBy(operator);
        updateById(profile);
    }

    public boolean updateMineCategory(Long userId, String memberCategory, String operator) {
        PaleoMemberProfile profile = getOrCreate(userId, operator);
        profile.setMemberCategory(memberCategory);
        profile.setUpdateBy(operator);
        return updateById(profile);
    }

    public void refreshExpiredStatus(PaleoMemberProfile profile, String operator) {
        if (profile == null || !"ACTIVE".equals(profile.getMemberStatus()) || profile.getValidEndDate() == null) {
            return;
        }
        if (profile.getValidEndDate().before(new Date())) {
            profile.setMemberStatus("EXPIRED");
            profile.setUpdateBy(operator);
            updateById(profile);
            userService.updateUserType(profile.getUserId(), "non_member", true, operator);
        }
    }

    public int refreshExpiredMembers() {
        List<PaleoMemberProfile> profiles = list(new LambdaQueryWrapper<PaleoMemberProfile>()
                .eq(PaleoMemberProfile::getMemberStatus, "ACTIVE")
                .isNotNull(PaleoMemberProfile::getValidEndDate)
                .lt(PaleoMemberProfile::getValidEndDate, new Date()));
        for (PaleoMemberProfile profile : profiles) {
            profile.setMemberStatus("EXPIRED");
            profile.setUpdateBy("paleo-expire-job");
            updateById(profile);
            userService.updateUserType(profile.getUserId(), "non_member", true, "paleo-expire-job");
        }
        return profiles.size();
    }
}
