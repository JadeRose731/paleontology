package com.chuanghai.paleo.cms.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.chuanghai.paleo.cms.domain.PaleoMembershipTemplate;
import com.chuanghai.paleo.cms.mapper.PaleoMembershipTemplateMapper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class PaleoMembershipTemplateService extends ServiceImpl<PaleoMembershipTemplateMapper, PaleoMembershipTemplate> {

    public PaleoMembershipTemplate getByType(String templateType) {
        return getOne(new LambdaQueryWrapper<PaleoMembershipTemplate>()
                .eq(PaleoMembershipTemplate::getTemplateType, templateType)
                .last("LIMIT 1"));
    }

    public PaleoMembershipTemplate upsert(String templateType, String fileName, String fileUrl, String operator) {
        PaleoMembershipTemplate existing = getByType(templateType);
        if (existing != null) {
            existing.setFileName(fileName);
            existing.setFileUrl(fileUrl);
            existing.setUpdateBy(operator);
            updateById(existing);
            return existing;
        }
        PaleoMembershipTemplate created = new PaleoMembershipTemplate();
        created.setTemplateType(templateType);
        created.setFileName(fileName);
        created.setFileUrl(fileUrl);
        created.setUpdateBy(operator);
        save(created);
        return created;
    }

    public Map<String, Object> toPublicMap(PaleoMembershipTemplate template) {
        Map<String, Object> item = new HashMap<>();
        if (template == null) {
            item.put("fileName", null);
            item.put("fileUrl", null);
            item.put("updateTime", null);
            return item;
        }
        item.put("fileName", template.getFileName());
        item.put("fileUrl", template.getFileUrl());
        item.put("updateTime", template.getUpdateTime());
        return item;
    }

    public Map<String, Object> getPublicTemplates() {
        List<PaleoMembershipTemplate> all = list();
        PaleoMembershipTemplate join = null;
        PaleoMembershipTemplate withdraw = null;
        for (PaleoMembershipTemplate t : all) {
            if ("JOIN".equalsIgnoreCase(t.getTemplateType())) {
                join = t;
            } else if ("WITHDRAW".equalsIgnoreCase(t.getTemplateType())) {
                withdraw = t;
            }
        }
        Map<String, Object> result = new HashMap<>();
        result.put("join", toPublicMap(join));
        result.put("withdraw", toPublicMap(withdraw));
        return result;
    }

    public static void validateTemplateType(String templateType) {
        if (!StringUtils.hasText(templateType)) {
            throw new IllegalArgumentException("模板类型不能为空");
        }
        String normalized = templateType.trim().toUpperCase();
        if (!"JOIN".equals(normalized) && !"WITHDRAW".equals(normalized)) {
            throw new IllegalArgumentException("模板类型仅支持 JOIN 或 WITHDRAW");
        }
    }

    public static String normalizeTemplateType(String templateType) {
        validateTemplateType(templateType);
        return templateType.trim().toUpperCase();
    }
}
