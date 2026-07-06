package com.chuanghai.paleo.cms.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.chuanghai.paleo.cms.domain.CmsAdminUser;
import com.chuanghai.paleo.cms.domain.PaleoAdminAssociation;
import com.chuanghai.paleo.cms.domain.PaleoAssociation;
import com.chuanghai.paleo.cms.mapper.CmsAdminUserMapper;
import com.chuanghai.paleo.cms.mapper.PaleoAdminAssociationMapper;
import com.chuanghai.paleo.cms.mapper.PaleoAssociationMapper;
import com.chuanghai.paleo.cms.security.LoginUser;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class PaleoAdminAssociationService {

    private static final String STATUS_BOUND = "BOUND";
    private static final String STATUS_UNBOUND = "UNBOUND";

    @Autowired
    private PaleoAdminAssociationMapper adminAssociationMapper;

    @Autowired
    private CmsAdminUserMapper adminUserMapper;

    @Autowired
    private PaleoAssociationMapper associationMapper;

    @Autowired
    private PaleoAssociationCodeService associationCodeService;

    public Map<String, Object> getMine(LoginUser user) {
        List<Long> associationIds = listBoundAssociationIds(user.getUserId());
        List<String> branchCodes = new ArrayList<>();
        List<String> associationNames = new ArrayList<>();

        for (Long associationId : associationIds) {
            PaleoAssociation assoc = associationMapper.selectById(associationId);
            if (assoc == null) {
                continue;
            }
            if (StringUtils.hasText(assoc.getBranchCode())) {
                branchCodes.add(assoc.getBranchCode());
            }
            associationNames.add(assoc.getAssociationName());
        }

        if (branchCodes.isEmpty() && StringUtils.hasText(user.getBranchId())) {
            branchCodes.add(user.getBranchId().trim());
            Long fallbackId = associationCodeService.branchCodeToAssociationId(user.getBranchId());
            if (fallbackId != null) {
                associationIds = new ArrayList<>();
                associationIds.add(fallbackId);
                PaleoAssociation assoc = associationMapper.selectById(fallbackId);
                if (assoc != null) {
                    associationNames.add(assoc.getAssociationName());
                }
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("branchCodes", branchCodes);
        result.put("associationIds", associationIds);
        result.put("associationNames", associationNames);
        return result;
    }

    public List<Map<String, Object>> listBindings() {
        List<PaleoAdminAssociation> bindings = adminAssociationMapper.selectList(
                new LambdaQueryWrapper<PaleoAdminAssociation>()
                        .eq(PaleoAdminAssociation::getBindingStatus, STATUS_BOUND)
                        .orderByAsc(PaleoAdminAssociation::getAdminUserId));

        List<Map<String, Object>> rows = new ArrayList<>();
        for (PaleoAdminAssociation binding : bindings) {
            rows.add(toBindingRow(binding));
        }
        return rows;
    }

    public List<Map<String, Object>> listAdmins() {
        List<CmsAdminUser> admins = adminUserMapper.selectList(new LambdaQueryWrapper<CmsAdminUser>()
                .eq(CmsAdminUser::getStatus, "1")
                .orderByAsc(CmsAdminUser::getUserId));

        List<Map<String, Object>> rows = new ArrayList<>();
        for (CmsAdminUser admin : admins) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("userId", admin.getUserId());
            row.put("username", admin.getUsername());
            row.put("email", admin.getEmail());
            row.put("displayName", admin.getDisplayName());
            row.put("role", admin.getRole());
            row.put("branchId", admin.getBranchId());
            rows.add(row);
        }
        return rows;
    }

    @Transactional
    public PaleoAdminAssociation bind(Long adminUserId, Long associationId) {
        assertAdminExists(adminUserId);
        assertAssociationExists(associationId);

        PaleoAdminAssociation existing = adminAssociationMapper.selectOne(
                new LambdaQueryWrapper<PaleoAdminAssociation>()
                        .eq(PaleoAdminAssociation::getAdminUserId, adminUserId)
                        .eq(PaleoAdminAssociation::getAssociationId, associationId)
                        .last("LIMIT 1"));

        if (existing != null) {
            existing.setBindingStatus(STATUS_BOUND);
            adminAssociationMapper.updateById(existing);
            syncAdminBranchId(adminUserId);
            return existing;
        }

        PaleoAdminAssociation binding = new PaleoAdminAssociation();
        binding.setAdminUserId(adminUserId);
        binding.setAssociationId(associationId);
        binding.setBindingStatus(STATUS_BOUND);
        adminAssociationMapper.insert(binding);
        syncAdminBranchId(adminUserId);
        return binding;
    }

    @Transactional
    public boolean unbind(Long adminUserId, Long associationId) {
        PaleoAdminAssociation existing = adminAssociationMapper.selectOne(
                new LambdaQueryWrapper<PaleoAdminAssociation>()
                        .eq(PaleoAdminAssociation::getAdminUserId, adminUserId)
                        .eq(PaleoAdminAssociation::getAssociationId, associationId)
                        .last("LIMIT 1"));
        if (existing == null) {
            return false;
        }
        existing.setBindingStatus(STATUS_UNBOUND);
        adminAssociationMapper.updateById(existing);
        syncAdminBranchId(adminUserId);
        return true;
    }

    @Transactional
    public List<PaleoAdminAssociation> replaceBindings(Long adminUserId, List<Long> associationIds) {
        assertAdminExists(adminUserId);

        List<Long> targetIds = associationIds == null ? new ArrayList<>() : associationIds.stream()
                .distinct()
                .collect(Collectors.toList());
        for (Long associationId : targetIds) {
            assertAssociationExists(associationId);
        }

        List<PaleoAdminAssociation> existing = adminAssociationMapper.selectList(
                new LambdaQueryWrapper<PaleoAdminAssociation>()
                        .eq(PaleoAdminAssociation::getAdminUserId, adminUserId));

        Map<Long, PaleoAdminAssociation> byAssociationId = new HashMap<>();
        for (PaleoAdminAssociation binding : existing) {
            byAssociationId.put(binding.getAssociationId(), binding);
        }

        for (PaleoAdminAssociation binding : existing) {
            if (!targetIds.contains(binding.getAssociationId()) && STATUS_BOUND.equals(binding.getBindingStatus())) {
                binding.setBindingStatus(STATUS_UNBOUND);
                adminAssociationMapper.updateById(binding);
            }
        }

        List<PaleoAdminAssociation> result = new ArrayList<>();
        for (Long associationId : targetIds) {
            PaleoAdminAssociation binding = byAssociationId.get(associationId);
            if (binding != null) {
                binding.setBindingStatus(STATUS_BOUND);
                adminAssociationMapper.updateById(binding);
                result.add(binding);
            } else {
                binding = new PaleoAdminAssociation();
                binding.setAdminUserId(adminUserId);
                binding.setAssociationId(associationId);
                binding.setBindingStatus(STATUS_BOUND);
                adminAssociationMapper.insert(binding);
                result.add(binding);
            }
        }

        syncAdminBranchId(adminUserId);
        return result;
    }

    public List<Map<String, Object>> listBranchAssociations() {
        List<PaleoAssociation> branches = associationMapper.selectList(new LambdaQueryWrapper<PaleoAssociation>()
                .isNotNull(PaleoAssociation::getBranchCode)
                .ne(PaleoAssociation::getBranchCode, "zgswxh")
                .orderByAsc(PaleoAssociation::getSortOrder));

        List<Map<String, Object>> rows = new ArrayList<>();
        for (PaleoAssociation assoc : branches) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("associationId", assoc.getAssociationId());
            row.put("branchCode", assoc.getBranchCode());
            row.put("associationName", assoc.getAssociationName());
            rows.add(row);
        }
        return rows;
    }

    private List<Long> listBoundAssociationIds(Long adminUserId) {
        if (adminUserId == null) {
            return new ArrayList<>();
        }
        return adminAssociationMapper.selectList(new LambdaQueryWrapper<PaleoAdminAssociation>()
                        .eq(PaleoAdminAssociation::getAdminUserId, adminUserId)
                        .eq(PaleoAdminAssociation::getBindingStatus, STATUS_BOUND)
                        .orderByAsc(PaleoAdminAssociation::getBindingId))
                .stream()
                .map(PaleoAdminAssociation::getAssociationId)
                .collect(Collectors.toList());
    }

    private void syncAdminBranchId(Long adminUserId) {
        CmsAdminUser admin = adminUserMapper.selectById(adminUserId);
        if (admin == null || !"branch_admin".equals(admin.getRole())) {
            return;
        }
        List<Long> boundIds = listBoundAssociationIds(adminUserId);
        String primaryBranchCode = null;
        if (!boundIds.isEmpty()) {
            PaleoAssociation assoc = associationMapper.selectById(boundIds.get(0));
            if (assoc != null && StringUtils.hasText(assoc.getBranchCode())) {
                primaryBranchCode = assoc.getBranchCode();
            }
        }
        admin.setBranchId(primaryBranchCode);
        adminUserMapper.updateById(admin);
    }

    private Map<String, Object> toBindingRow(PaleoAdminAssociation binding) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("bindingId", binding.getBindingId());
        row.put("adminUserId", binding.getAdminUserId());
        row.put("associationId", binding.getAssociationId());
        row.put("bindingStatus", binding.getBindingStatus());
        row.put("createTime", binding.getCreateTime());

        CmsAdminUser admin = adminUserMapper.selectById(binding.getAdminUserId());
        if (admin != null) {
            row.put("adminEmail", admin.getEmail());
            row.put("adminName", admin.getDisplayName());
            row.put("adminRole", admin.getRole());
        }

        PaleoAssociation assoc = associationMapper.selectById(binding.getAssociationId());
        if (assoc != null) {
            row.put("branchCode", assoc.getBranchCode());
            row.put("associationName", assoc.getAssociationName());
        }
        return row;
    }

    private void assertAdminExists(Long adminUserId) {
        if (adminUserId == null || adminUserMapper.selectById(adminUserId) == null) {
            throw new IllegalArgumentException("管理员不存在");
        }
    }

    private void assertAssociationExists(Long associationId) {
        if (associationId == null || associationMapper.selectById(associationId) == null) {
            throw new IllegalArgumentException("分会不存在");
        }
    }
}
