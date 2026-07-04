package com.chuanghai.paleo.cms.common;

import com.chuanghai.paleo.cms.security.LoginUser;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public abstract class BaseController {

    protected AjaxResult success() {
        return AjaxResult.success();
    }

    protected AjaxResult success(Object data) {
        return AjaxResult.success(data);
    }

    protected AjaxResult error(String msg) {
        return AjaxResult.error(msg);
    }

    protected TableDataInfo getDataTable(java.util.List<?> list) {
        return PageUtils.build(list);
    }

    protected TableDataInfo getDataTable(com.baomidou.mybatisplus.core.metadata.IPage<?> page) {
        return PageUtils.build(page);
    }

    protected AjaxResult toAjax(boolean result) {
        return result ? success() : error("操作失败");
    }

    protected String getUsername() {
        LoginUser user = currentUser();
        return user != null ? user.getUsername() : "anonymous";
    }

    protected LoginUser currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof LoginUser) {
            return (LoginUser) auth.getPrincipal();
        }
        return null;
    }
}
