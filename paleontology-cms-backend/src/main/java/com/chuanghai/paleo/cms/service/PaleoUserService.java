package com.chuanghai.paleo.cms.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.chuanghai.paleo.cms.domain.PaleoUser;
import com.chuanghai.paleo.cms.mapper.PaleoUserMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class PaleoUserService extends ServiceImpl<PaleoUserMapper, PaleoUser> {

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private PaleoMemberProfileService memberProfileService;

    public PaleoUser findByEmail(String email) {
        return getOne(new LambdaQueryWrapper<PaleoUser>()
                .eq(PaleoUser::getEmail, email)
                .eq(PaleoUser::getStatus, "1")
                .last("LIMIT 1"));
    }

    public PaleoUser register(PaleoUser user, String rawPassword) {
        if (!StringUtils.hasText(user.getEmail()) || !StringUtils.hasText(rawPassword)) {
            throw new IllegalArgumentException("邮箱和密码不能为空");
        }
        if (findByEmail(user.getEmail()) != null) {
            throw new IllegalArgumentException("该邮箱已注册");
        }
        user.setUserId(null);
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        user.setStatus("1");
        if (!StringUtils.hasText(user.getUserType())) {
            user.setUserType("regular");
        }
        if (!StringUtils.hasText(user.getMembershipChoiceMade())) {
            user.setMembershipChoiceMade("0");
        }
        if (!StringUtils.hasText(user.getIsStudent())) {
            user.setIsStudent("0");
        }
        user.setCreateBy(user.getEmail());
        save(user);
        memberProfileService.getOrCreate(user.getUserId(), user.getEmail());
        return sanitize(user);
    }

    public PaleoUser login(String email, String rawPassword) {
        PaleoUser user = findByEmail(email);
        if (user == null || !passwordEncoder.matches(rawPassword, user.getPasswordHash())) {
            throw new IllegalArgumentException("邮箱或密码错误");
        }
        return sanitize(user);
    }

    public PaleoUser updateUserType(Long userId, String userType, Boolean choiceMade, String operator) {
        PaleoUser user = getById(userId);
        if (user == null) {
            throw new IllegalArgumentException("用户不存在");
        }
        if (StringUtils.hasText(userType)) {
            user.setUserType(userType);
        }
        if (choiceMade != null) {
            user.setMembershipChoiceMade(choiceMade ? "1" : "0");
        }
        user.setUpdateBy(operator);
        updateById(user);
        return sanitize(user);
    }

    public PaleoUser updateProfile(Long userId, PaleoUser patch, String operator) {
        PaleoUser user = getById(userId);
        if (user == null) {
            throw new IllegalArgumentException("用户不存在");
        }
        if (StringUtils.hasText(patch.getUserName())) user.setUserName(patch.getUserName());
        if (StringUtils.hasText(patch.getGender())) user.setGender(patch.getGender());
        if (StringUtils.hasText(patch.getUnit())) user.setUnit(patch.getUnit());
        if (StringUtils.hasText(patch.getRoleLabel())) user.setRoleLabel(patch.getRoleLabel());
        if (StringUtils.hasText(patch.getTitle())) user.setTitle(patch.getTitle());
        if (StringUtils.hasText(patch.getIsStudent())) user.setIsStudent(patch.getIsStudent());
        user.setUpdateBy(operator);
        updateById(user);
        return sanitize(user);
    }

    public PaleoUser sanitize(PaleoUser user) {
        if (user != null) {
            user.setPasswordHash(null);
        }
        return user;
    }
}
