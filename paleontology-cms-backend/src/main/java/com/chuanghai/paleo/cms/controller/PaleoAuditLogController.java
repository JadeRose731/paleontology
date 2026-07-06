package com.chuanghai.paleo.cms.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.chuanghai.paleo.cms.common.AjaxResult;
import com.chuanghai.paleo.cms.common.BaseController;
import com.chuanghai.paleo.cms.common.TableDataInfo;
import com.chuanghai.paleo.cms.domain.PaleoAuditLog;
import com.chuanghai.paleo.cms.security.LoginUser;
import com.chuanghai.paleo.cms.security.RequireAdminRole;
import com.chuanghai.paleo.cms.service.AuditLogService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Api(tags = "审计追溯")
@RestController
@RequestMapping("/paleo/audit")
@RequireAdminRole({"super_admin", "branch_admin"})
public class PaleoAuditLogController extends BaseController {

    @Autowired
    private AuditLogService auditLogService;

    @ApiOperation("分页查询审计日志")
    @GetMapping("/logs")
    public TableDataInfo logs(@RequestParam(defaultValue = "1") int pageNum,
                              @RequestParam(defaultValue = "20") int pageSize,
                              @RequestParam(required = false) String action,
                              @RequestParam(required = false) String operatorEmail,
                              @RequestParam(required = false) Long associationId,
                              @RequestParam(required = false) String startTime,
                              @RequestParam(required = false) String endTime,
                              @RequestParam(required = false) String targetType) {
        LoginUser user = currentUser();
        Page<PaleoAuditLog> page = auditLogService.listForAdmin(
                user, pageNum, pageSize, action, operatorEmail, associationId, startTime, endTime, targetType);
        return getDataTable(page);
    }

    @ApiOperation("审计动作枚举（前端筛选用）")
    @GetMapping("/actions")
    public AjaxResult actions() {
        return success(new String[]{
                "MEMBERSHIP_VOUCHER_APPROVE", "MEMBERSHIP_VOUCHER_REJECT",
                "MEMBERSHIP_INVOICE_APPROVE", "MEMBERSHIP_INVOICE_REJECT",
                "JOIN_APPLICATION_APPROVE", "JOIN_APPLICATION_REJECT",
                "WITHDRAW_APPLICATION_APPROVE", "WITHDRAW_APPLICATION_REJECT",
                "CONFERENCE_VOUCHER_APPROVE", "CONFERENCE_VOUCHER_REJECT",
                "CONFERENCE_INVOICE_APPROVE", "CONFERENCE_INVOICE_REJECT",
                "ABSTRACT_ADMIN_EDIT", "ACCOMMODATION_ADMIN_EDIT",
                "INVOICE_DEADLINE_EXTEND",
                "CMS_PUBLISH", "CMS_UNPUBLISH",
                "ADMIN_BINDING_CREATE", "ADMIN_BINDING_REMOVE",
                "RECOGNITION_MANUAL_REVIEW"
        });
    }
}
