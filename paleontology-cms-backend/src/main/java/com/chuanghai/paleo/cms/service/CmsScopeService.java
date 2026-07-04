package com.chuanghai.paleo.cms.service;

import com.chuanghai.paleo.cms.security.LoginUser;
import org.springframework.stereotype.Service;

@Service
public class CmsScopeService {

    public boolean canAccessAssociation(LoginUser user, Long associationId) {
        if (user == null) {
            return false;
        }
        if ("admin".equals(user.getRole())) {
            return true;
        }
        if ("branch_admin".equals(user.getRole())) {
            if (associationId == null) {
                return false;
            }
            return String.valueOf(associationId).equals(user.getBranchId());
        }
        return true;
    }
}
