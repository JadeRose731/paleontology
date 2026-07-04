package com.chuanghai.paleo.cms.util;

import com.chuanghai.paleo.cms.domain.PaleoCmsChannel;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class CmsChannelTreeUtil {

    private CmsChannelTreeUtil() {
    }

    public static List<Map<String, Object>> buildTree(List<PaleoCmsChannel> channels, Long rootParentId) {
        Map<Long, List<PaleoCmsChannel>> childrenMap = new LinkedHashMap<>();
        for (PaleoCmsChannel channel : channels) {
            Long parentId = channel.getParentId() == null ? 0L : channel.getParentId();
            childrenMap.computeIfAbsent(parentId, key -> new ArrayList<>()).add(channel);
        }
        return buildNodes(childrenMap, rootParentId == null ? 0L : rootParentId);
    }

    private static List<Map<String, Object>> buildNodes(Map<Long, List<PaleoCmsChannel>> childrenMap, Long parentId) {
        List<PaleoCmsChannel> siblings = childrenMap.get(parentId);
        if (siblings == null || siblings.isEmpty()) {
            return new ArrayList<>();
        }
        List<Map<String, Object>> nodes = new ArrayList<>();
        for (PaleoCmsChannel channel : siblings) {
            Map<String, Object> node = new LinkedHashMap<>();
            node.put("channel", channel);
            List<Map<String, Object>> children = buildNodes(childrenMap, channel.getChannelId());
            if (!children.isEmpty()) {
                node.put("children", children);
            }
            nodes.add(node);
        }
        return nodes;
    }
}
