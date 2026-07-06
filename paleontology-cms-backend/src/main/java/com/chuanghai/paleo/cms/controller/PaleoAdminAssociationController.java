package com.chuanghai.paleo.cms.controller;

import com.chuanghai.paleo.cms.common.AjaxResult;
import com.chuanghai.paleo.cms.common.BaseController;
import com.chuanghai.paleo.cms.security.LoginUser;
import com.chuanghai.paleo.cms.security.RequireAdminRole;
import com.chuanghai.paleo.cms.common.AuditAction;
import com.chuanghai.paleo.cms.service.AuditLogService;
import com.chuanghai.paleo.cms.domain.PaleoAdminAssociation;
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

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Api(tags = "管理员分会绑定")
@RestController
@RequestMapping("/paleo/admin/associations")
public class PaleoAdminAssociationController extends BaseController {

    @Autowired
    private PaleoAdminAssociationService adminAssociationService;

    @Autowired
    private AuditLogService auditLogService;

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
    @ApiOperation("分会列表（数据权限配置用）")
    @GetMapping("/branches")
    public AjaxResult branches() {
        return success(adminAssociationService.listBranchAssociations());
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
            PaleoAdminAssociation binding = adminAssociationService.bind(adminUserId, associationId);
            Map<String, Object> detail = new HashMap<>();
            detail.put("adminUserId", adminUserId);
            detail.put("associationId", associationId);
            auditLogService.log(currentUser(), AuditAction.ADMIN_BINDING_CREATE, "binding",
                    String.valueOf(binding.getBindingId()), associationId,
                    String.format("绑定管理员 userId=%d 与分会 associationId=%d", adminUserId, associationId),
                    detail);
            return success(binding);
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
        boolean ok = adminAssociationService.unbind(adminUserId, associationId);
        if (ok) {
            Map<String, Object> detail = new HashMap<>();
            detail.put("adminUserId", adminUserId);
            detail.put("associationId", associationId);
            auditLogService.log(currentUser(), AuditAction.ADMIN_BINDING_REMOVE, "binding",
                    adminUserId + ":" + associationId, associationId,
                    String.format("解绑管理员 userId=%d 与分会 associationId=%d", adminUserId, associationId),
                    detail);
        }
        return toAjax(ok);
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
            List<PaleoAdminAssociation> bindings = adminAssociationService.replaceBindings(adminUserId, associationIds);
            Map<String, Object> detail = new HashMap<>();
            detail.put("adminUserId", adminUserId);
            detail.put("associationIds", associationIds != null ? associationIds : Collections.<Long>emptyList());
            auditLogService.log(currentUser(), AuditAction.ADMIN_BINDING_CREATE, "binding",
                    String.valueOf(adminUserId), null,
                    String.format("批量替换管理员 userId=%d 的分会绑定（共 %d 项）", adminUserId,
                            associationIds != null ? associationIds.size() : 0),
                    detail);
            return success(bindings);
        } catch (IllegalArgumentException ex) {
            return error(ex.getMessage());
        }
    }
}
