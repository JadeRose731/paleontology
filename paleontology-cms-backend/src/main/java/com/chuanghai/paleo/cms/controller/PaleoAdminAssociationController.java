package com.chuanghai.paleo.cms.controller;

import com.chuanghai.paleo.cms.common.AjaxResult;
import com.chuanghai.paleo.cms.common.BaseController;
import com.chuanghai.paleo.cms.security.LoginUser;
import com.chuanghai.paleo.cms.security.RequireAdminRole;
import com.chuanghai.paleo.cms.service.PaleoAdminAssociationService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@Api(tags = "管理员分会绑定")
@RestController
@RequestMapping("/paleo/admin/associations")
public class PaleoAdminAssociationController extends BaseController {

    @Autowired
    private PaleoAdminAssociationService adminAssociationService;

    @ApiOperation("当前管理员绑定的分会")
    @GetMapping("/mine")
    public AjaxResult mine() {
        LoginUser user = currentUser();
        if (user == null) {
            return error("未登录");
        }
        return success(adminAssociationService.getMine(user));
    }

    @RequireAdminRole("super_admin")
    @ApiOperation("全部管理员-分会绑定")
    @GetMapping("/bindings")
    public AjaxResult bindings() {
        return success(adminAssociationService.listBindings());
    }

    @RequireAdminRole("super_admin")
    @ApiOperation("管理员账号列表")
    @GetMapping("/admins")
    public AjaxResult admins() {
        return success(adminAssociationService.listAdmins());
    }

    @RequireAdminRole("super_admin")
    @ApiOperation("绑定管理员与分会")
    @PostMapping("/bindings")
    public AjaxResult bind(@RequestBody Map<String, Long> body) {
        Long adminUserId = body.get("adminUserId");
        Long associationId = body.get("associationId");
        if (adminUserId == null || associationId == null) {
            return error("adminUserId 与 associationId 不能为空");
        }
        try {
            return success(adminAssociationService.bind(adminUserId, associationId));
        } catch (IllegalArgumentException ex) {
            return error(ex.getMessage());
        }
    }

    @RequireAdminRole("super_admin")
    @ApiOperation("解绑管理员与分会")
    @PostMapping("/bindings/unbind")
    public AjaxResult unbind(@RequestBody Map<String, Long> body) {
        Long adminUserId = body.get("adminUserId");
        Long associationId = body.get("associationId");
        if (adminUserId == null || associationId == null) {
            return error("adminUserId 与 associationId 不能为空");
        }
        return toAjax(adminAssociationService.unbind(adminUserId, associationId));
    }

    @RequireAdminRole("super_admin")
    @ApiOperation("批量替换某管理员的全部绑定")
    @PutMapping("/bindings/replace")
    public AjaxResult replace(@RequestBody Map<String, Object> body) {
        Object adminUserIdObj = body.get("adminUserId");
        if (!(adminUserIdObj instanceof Number)) {
            return error("adminUserId 不能为空");
        }
        Long adminUserId = ((Number) adminUserIdObj).longValue();
        @SuppressWarnings("unchecked")
        List<Long> associationIds = (List<Long>) body.get("associationIds");
        try {
            return success(adminAssociationService.replaceBindings(adminUserId, associationIds));
        } catch (IllegalArgumentException ex) {
            return error(ex.getMessage());
        }
    }
}
