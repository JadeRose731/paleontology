package com.chuanghai.paleo.cms.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.chuanghai.paleo.cms.domain.PaleoAssociation;
import com.chuanghai.paleo.cms.mapper.PaleoAssociationMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import javax.annotation.PostConstruct;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class PaleoAssociationCodeService {

    @Autowired
    private PaleoAssociationMapper associationMapper;

    private final Map<String, Long> codeToId = new ConcurrentHashMap<>();
    private final Map<Long, String> idToCode = new ConcurrentHashMap<>();

    @PostConstruct
    public void refreshCache() {
        codeToId.clear();
        idToCode.clear();
        for (PaleoAssociation assoc : associationMapper.selectList(new LambdaQueryWrapper<PaleoAssociation>()
                .isNotNull(PaleoAssociation::getBranchCode))) {
            if (StringUtils.hasText(assoc.getBranchCode())) {
                codeToId.put(assoc.getBranchCode(), assoc.getAssociationId());
                idToCode.put(assoc.getAssociationId(), assoc.getBranchCode());
            }
        }
    }

    public Long branchCodeToAssociationId(String branchCode) {
        if (!StringUtils.hasText(branchCode)) {
            return null;
        }
        return codeToId.get(branchCode.trim());
    }

    public String associationIdToBranchCode(Long associationId) {
        if (associationId == null) {
            return null;
        }
        return idToCode.get(associationId);
    }

    public List<Long> allAssociationIds() {
        return associationMapper.selectList(new LambdaQueryWrapper<PaleoAssociation>()
                        .orderByAsc(PaleoAssociation::getSortOrder))
                .stream()
                .map(PaleoAssociation::getAssociationId)
                .collect(Collectors.toList());
    }

    public List<Long> branchAssociationIds() {
        return codeToId.values().stream().distinct().collect(Collectors.toList());
    }

    public Map<String, Long> getCodeToIdMap() {
        return Collections.unmodifiableMap(codeToId);
    }
}
