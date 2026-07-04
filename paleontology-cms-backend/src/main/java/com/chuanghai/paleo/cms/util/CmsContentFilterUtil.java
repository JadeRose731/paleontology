package com.chuanghai.paleo.cms.util;

import com.chuanghai.paleo.cms.domain.PaleoCmsChannel;
import com.chuanghai.paleo.cms.domain.PaleoCmsEntry;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.util.StringUtils;

import java.util.Map;

public final class CmsContentFilterUtil {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private CmsContentFilterUtil() {
    }

    public static PaleoCmsEntry toEntryQuery(PaleoCmsChannel channel) {
        PaleoCmsEntry query = new PaleoCmsEntry();
        if (StringUtils.hasText(channel.getContentModule())) {
            query.setModuleCode(channel.getContentModule());
        }
        if (!StringUtils.hasText(channel.getContentFilter())) {
            return query;
        }
        try {
            Map<String, String> filter = MAPPER.readValue(
                    channel.getContentFilter(),
                    new TypeReference<Map<String, String>>() {
                    }
            );
            if (StringUtils.hasText(filter.get("moduleCode"))) {
                query.setModuleCode(filter.get("moduleCode"));
            }
            if (StringUtils.hasText(filter.get("columnCode"))) {
                query.setColumnCode(filter.get("columnCode"));
            }
            if (StringUtils.hasText(filter.get("scope"))) {
                query.setScope(filter.get("scope"));
            }
            if (StringUtils.hasText(filter.get("category"))) {
                query.setCategory(filter.get("category"));
            }
        } catch (Exception ignored) {
            // content_filter 为自由 JSON，解析失败时仅使用 content_module
        }
        return query;
    }
}
