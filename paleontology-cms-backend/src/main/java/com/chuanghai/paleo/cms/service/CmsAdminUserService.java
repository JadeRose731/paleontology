package com.chuanghai.paleo.cms.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.chuanghai.paleo.cms.domain.CmsAdminUser;
import com.chuanghai.paleo.cms.mapper.CmsAdminUserMapper;
import org.springframework.stereotype.Service;

@Service
public class CmsAdminUserService extends ServiceImpl<CmsAdminUserMapper, CmsAdminUser> {

    public CmsAdminUser findByUsername(String username) {
        return getOne(new LambdaQueryWrapper<CmsAdminUser>()
                .eq(CmsAdminUser::getUsername, username)
                .eq(CmsAdminUser::getStatus, "1"));
    }
}
