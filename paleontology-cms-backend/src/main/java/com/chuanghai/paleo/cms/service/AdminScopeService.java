package com.chuanghai.paleo.cms.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.chuanghai.paleo.cms.domain.PaleoAdminAssociation;
import com.chuanghai.paleo.cms.mapper.PaleoAdminAssociationMapper;
import com.chuanghai.paleo.cms.security.AdminAccessDeniedException;
import com.chuanghai.paleo.cms.security.LoginUser;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class AdminScopeService {

    public static final String ROLE_SUPER_ADMIN = "super_admin";
    public static final String ROLE_BRANCH_ADMIN = "branch_admin";
    public static final String ROLE_FINANCE_REVIEWER = "finance_reviewer";
    /** 兼容旧 JWT */
    public static final String ROLE_LEGACY_ADMIN = "admin";

    @Autowired
    private PaleoAssociationCodeService associationCodeService;

    @Autowired
    private PaleoAdminAssociationMapper adminAssociationMapper;

    public boolean isSuperAdmin(LoginUser user) {
        if (user == null || !StringUtils.hasText(user.getRole())) {
            return false;
        }
        String role = user.getRole();
        return ROLE_SUPER_ADMIN.equals(role) || ROLE_LEGACY_ADMIN.equals(role);
    }

    public boolean isFinanceReviewer(LoginUser user) {
        return user != null && ROLE_FINANCE_REVIEWER.equals(user.getRole());
    }

    public boolean isBranchAdmin(LoginUser user) {
        return user != null && ROLE_BRANCH_ADMIN.equals(user.getRole());
    }

    public boolean isSiteWideReader(LoginUser user) {
        return isSuperAdmin(user) || isFinanceReviewer(user);
    }

    public boolean canWriteCms(LoginUser user) {
        return isSuperAdmin(user) || isBranchAdmin(user);
    }

    public boolean canAccessBranchCode(LoginUser user, String branchCode) {
        if (user == null) {
            return false;
        }
        if (isSiteWideReader(user)) {
            return true;
        }
        if (!isBranchAdmin(user)) {
            return false;
        }
        if (!StringUtils.hasText(branchCode) || !StringUtils.hasText(user.getBranchId())) {
            return false;
        }
        return branchCode.trim().equals(user.getBranchId().trim());
    }

    public boolean canAccessAssociationId(LoginUser user, Long associationId) {
        if (user == null) {
            return false;
        }
        if (isSiteWideReader(user)) {
            return true;
        }
        if (!isBranchAdmin(user)) {
            return false;
        }
        if (associationId == null) {
            return false;
        }
        return resolveAccessibleAssociationIds(user).contains(associationId);
    }

    public List<Long> resolveAccessibleAssociationIds(LoginUser user) {
        if (user == null) {
            return Collections.emptyList();
        }
        if (isSiteWideReader(user)) {
            return associationCodeService.allAssociationIds();
        }
        if (!isBranchAdmin(user)) {
            return Collections.emptyList();
        }

        List<Long> bound = adminAssociationMapper.selectList(new LambdaQueryWrapper<PaleoAdminAssociation>()
                        .eq(PaleoAdminAssociation::getAdminUserId, user.getUserId())
                        .eq(PaleoAdminAssociation::getBindingStatus, "BOUND"))
                .stream()
                .map(PaleoAdminAssociation::getAssociationId)
                .collect(Collectors.toList());

        if (!bound.isEmpty()) {
            return bound;
        }

        if (StringUtils.hasText(user.getBranchId())) {
            Long assocId = associationCodeService.branchCodeToAssociationId(user.getBranchId());
            if (assocId != null) {
                List<Long> fallback = new ArrayList<>();
                fallback.add(assocId);
                return fallback;
            }
        }
        return Collections.emptyList();
    }

    public void assertCanAccessAssociationId(LoginUser user, Long associationId) {
        if (!canAccessAssociationId(user, associationId)) {
            throw new AdminAccessDeniedException("无权访问该分会数据");
        }
    }

    public void assertCanWriteCms(LoginUser user) {
        if (!canWriteCms(user)) {
            throw new AdminAccessDeniedException("当前角色无权修改 CMS 内容");
        }
    }

    public void assertRole(LoginUser user, String... allowedRoles) {
        if (user == null || !StringUtils.hasText(user.getRole())) {
            throw new AdminAccessDeniedException("未登录或角色未知");
        }
        String role = user.getRole();
        for (String allowed : allowedRoles) {
            if (allowed.equals(role)) {
                return;
            }
            if (ROLE_SUPER_ADMIN.equals(allowed) && ROLE_LEGACY_ADMIN.equals(role)) {
                return;
            }
        }
        throw new AdminAccessDeniedException("当前角色无权执行此操作");
    }

    /** 兼容 CmsScopeService 旧调用 */
    public boolean canAccessAssociation(LoginUser user, Long associationId) {
        if (user == null) {
            return false;
        }
        if (associationId == null) {
            return isSuperAdmin(user);
        }
        return canAccessAssociationId(user, associationId);
    }
}
