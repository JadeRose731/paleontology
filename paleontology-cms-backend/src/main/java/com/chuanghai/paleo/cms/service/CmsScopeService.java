package com.chuanghai.paleo.cms.service;

import com.chuanghai.paleo.cms.security.LoginUser;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * @deprecated 请使用 {@link AdminScopeService}
 */
@Service
@Deprecated
public class CmsScopeService {

    @Autowired
    private AdminScopeService adminScopeService;

    public boolean canAccessAssociation(LoginUser user, Long associationId) {
        return adminScopeService.canAccessAssociation(user, associationId);
    }
}
