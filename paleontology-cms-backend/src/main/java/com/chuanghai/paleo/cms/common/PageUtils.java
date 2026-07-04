package com.chuanghai.paleo.cms.common;

import com.baomidou.mybatisplus.core.metadata.IPage;

public class PageUtils {

    public static TableDataInfo build(IPage<?> page) {
        TableDataInfo info = new TableDataInfo(page.getRecords(), page.getTotal());
        info.setCode(200);
        info.setMsg("查询成功");
        return info;
    }

    public static TableDataInfo build(java.util.List<?> list) {
        TableDataInfo info = new TableDataInfo(list, list.size());
        info.setCode(200);
        info.setMsg("查询成功");
        return info;
    }
}
