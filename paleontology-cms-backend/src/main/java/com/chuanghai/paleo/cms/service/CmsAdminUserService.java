package com.chuanghai.paleo.cms.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.chuanghai.paleo.cms.domain.CmsAdminUser;
import com.chuanghai.paleo.cms.mapper.CmsAdminUserMapper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class CmsAdminUserService extends ServiceImpl<CmsAdminUserMapper, CmsAdminUser> {

    public CmsAdminUser findByUsername(String username) {
        return getOne(new LambdaQueryWrapper<CmsAdminUser>()
                .eq(CmsAdminUser::getUsername, username)
                .eq(CmsAdminUser::getStatus, "1")
                .last("LIMIT 1"));
    }

    public CmsAdminUser findByEmail(String email) {
        if (!StringUtils.hasText(email)) {
            return null;
        }
        return getOne(new LambdaQueryWrapper<CmsAdminUser>()
                .eq(CmsAdminUser::getEmail, email.trim())
                .eq(CmsAdminUser::getStatus, "1")
                .last("LIMIT 1"));
    }

    /** 支持 username 或 email 登录 */
    public CmsAdminUser findByLoginId(String loginId) {
        if (!StringUtils.hasText(loginId)) {
            return null;
        }
        String id = loginId.trim();
        if (id.contains("@")) {
            CmsAdminUser byEmail = findByEmail(id);
            if (byEmail != null) {
                return byEmail;
            }
        }
        return findByUsername(id);
    }
}
