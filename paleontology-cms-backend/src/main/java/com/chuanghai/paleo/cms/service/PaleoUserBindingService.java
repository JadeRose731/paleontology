package com.chuanghai.paleo.cms.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.chuanghai.paleo.cms.domain.PaleoAssociation;
import com.chuanghai.paleo.cms.domain.PaleoUserBinding;
import com.chuanghai.paleo.cms.mapper.PaleoAssociationMapper;
import com.chuanghai.paleo.cms.mapper.PaleoUserBindingMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class PaleoUserBindingService {

    /** 总学会虚拟绑定，不写入 paleo_user_binding */
    private static final String MAIN_SOCIETY_CODE = "zgswxh";

    @Autowired
    private PaleoUserBindingMapper userBindingMapper;

    @Autowired
    private PaleoAssociationMapper associationMapper;

    public List<String> listMyBranchCodes(Long userId) {
        if (userId == null) {
            return new ArrayList<>();
        }
        List<PaleoUserBinding> bindings = userBindingMapper.selectList(new LambdaQueryWrapper<PaleoUserBinding>()
                .eq(PaleoUserBinding::getUserId, userId)
                .eq(PaleoUserBinding::getBindingStatus, "BOUND"));
        if (bindings.isEmpty()) {
            return new ArrayList<>();
        }
        List<Long> assocIds = bindings.stream()
                .map(PaleoUserBinding::getAssociationId)
                .collect(Collectors.toList());
        return associationMapper.selectList(new LambdaQueryWrapper<PaleoAssociation>()
                        .in(PaleoAssociation::getAssociationId, assocIds)
                        .isNotNull(PaleoAssociation::getBranchCode)
                        .ne(PaleoAssociation::getBranchCode, MAIN_SOCIETY_CODE))
                .stream()
                .map(PaleoAssociation::getBranchCode)
                .filter(StringUtils::hasText)
                .distinct()
                .collect(Collectors.toList());
    }

    public void bind(Long userId, String branchCode) {
        validateBindableBranch(branchCode);
        Long associationId = resolveAssociationId(branchCode);
        PaleoUserBinding existing = userBindingMapper.selectOne(new LambdaQueryWrapper<PaleoUserBinding>()
                .eq(PaleoUserBinding::getUserId, userId)
                .eq(PaleoUserBinding::getAssociationId, associationId)
                .last("LIMIT 1"));
        if (existing != null) {
        if ("BOUND".equals(existing.getBindingStatus())) {
            return;
        }
        existing.setBindingStatus("BOUND");
        userBindingMapper.updateById(existing);
        return;
    }
    PaleoUserBinding binding = new PaleoUserBinding();
    binding.setUserId(userId);
    binding.setAssociationId(associationId);
    binding.setBindingStatus("BOUND");
    userBindingMapper.insert(binding);
    }

    public void unbind(Long userId, String branchCode) {
        validateBindableBranch(branchCode);
        Long associationId = resolveAssociationId(branchCode);
        PaleoUserBinding existing = userBindingMapper.selectOne(new LambdaQueryWrapper<PaleoUserBinding>()
                .eq(PaleoUserBinding::getUserId, userId)
                .eq(PaleoUserBinding::getAssociationId, associationId)
                .last("LIMIT 1"));
        if (existing == null || !"BOUND".equals(existing.getBindingStatus())) {
            return;
        }
        existing.setBindingStatus("UNBOUND");
        userBindingMapper.updateById(existing);
    }

    private void validateBindableBranch(String branchCode) {
        if (!StringUtils.hasText(branchCode)) {
            throw new IllegalArgumentException("分会编码不能为空");
        }
        if (MAIN_SOCIETY_CODE.equals(branchCode)) {
            throw new IllegalArgumentException("总学会无需绑定");
        }
    }

    private Long resolveAssociationId(String branchCode) {
        PaleoAssociation association = associationMapper.selectOne(new LambdaQueryWrapper<PaleoAssociation>()
                .eq(PaleoAssociation::getBranchCode, branchCode)
                .last("LIMIT 1"));
        if (association == null) {
            throw new IllegalArgumentException("无效的分会编码：" + branchCode);
        }
        return association.getAssociationId();
    }
}
