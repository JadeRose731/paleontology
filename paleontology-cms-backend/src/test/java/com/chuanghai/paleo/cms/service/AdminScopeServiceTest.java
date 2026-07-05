package com.chuanghai.paleo.cms.service;

import com.chuanghai.paleo.cms.mapper.PaleoAdminAssociationMapper;
import com.chuanghai.paleo.cms.mapper.PaleoAssociationMapper;
import com.chuanghai.paleo.cms.security.AdminAccessDeniedException;
import com.chuanghai.paleo.cms.security.LoginUser;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AdminScopeServiceTest {

    @Mock
    private PaleoAssociationCodeService associationCodeService;

    @Mock
    private PaleoAdminAssociationMapper adminAssociationMapper;

    @InjectMocks
    private AdminScopeService adminScopeService;

    @BeforeEach
    void setUp() {
        Map<String, Long> codeMap = new HashMap<>();
        codeMap.put("gjzdw", 8L);
        codeMap.put("gwjzdwxfh", 2L);
        when(associationCodeService.getCodeToIdMap()).thenReturn(codeMap);
        when(associationCodeService.branchCodeToAssociationId("gjzdw")).thenReturn(8L);
        when(associationCodeService.branchCodeToAssociationId("gwjzdwxfh")).thenReturn(2L);
        when(associationCodeService.associationIdToBranchCode(8L)).thenReturn("gjzdw");
        when(associationCodeService.allAssociationIds()).thenReturn(Arrays.asList(1L, 2L, 8L));
    }

    @Test
    void branchAdminCanAccessOwnAssociation() {
        LoginUser user = new LoginUser(10L, "branch_gjzdw@paleo.org.cn", "古脊椎", "branch_admin", "gjzdw");
        when(adminAssociationMapper.selectList(org.mockito.ArgumentMatchers.any()))
                .thenReturn(Collections.emptyList());

        assertTrue(adminScopeService.canAccessAssociationId(user, 8L));
        assertFalse(adminScopeService.canAccessAssociationId(user, 2L));
    }

    @Test
    void financeReviewerHasSiteWideReadAccess() {
        LoginUser user = new LoginUser(3L, "finance@paleontology.org.cn", "财务", "finance_reviewer", null);
        assertTrue(adminScopeService.canAccessAssociationId(user, 2L));
        assertFalse(adminScopeService.canWriteCms(user));
    }

    @Test
    void superAdminHasFullAccess() {
        LoginUser user = new LoginUser(1L, "admin@paleontology.org.cn", "总管理员", "super_admin", null);
        assertTrue(adminScopeService.canAccessAssociationId(user, 8L));
        assertTrue(adminScopeService.canWriteCms(user));
    }

    @Test
    void assertAccessDeniedForCrossBranch() {
        LoginUser user = new LoginUser(10L, "branch_gjzdw@paleo.org.cn", "古脊椎", "branch_admin", "gjzdw");
        when(adminAssociationMapper.selectList(org.mockito.ArgumentMatchers.any()))
                .thenReturn(Collections.emptyList());

        assertThrows(AdminAccessDeniedException.class,
                () -> adminScopeService.assertCanAccessAssociationId(user, 2L));
    }

    @Test
    void resolveAccessibleAssociationIdsUsesBindingTable() {
        LoginUser user = new LoginUser(10L, "branch_gjzdw@paleo.org.cn", "古脊椎", "branch_admin", "gjzdw");
        com.chuanghai.paleo.cms.domain.PaleoAdminAssociation binding = new com.chuanghai.paleo.cms.domain.PaleoAdminAssociation();
        binding.setAssociationId(8L);
        when(adminAssociationMapper.selectList(org.mockito.ArgumentMatchers.any()))
                .thenReturn(Collections.singletonList(binding));

        List<Long> ids = adminScopeService.resolveAccessibleAssociationIds(user);
        assertEquals(Collections.singletonList(8L), ids);
    }
}
