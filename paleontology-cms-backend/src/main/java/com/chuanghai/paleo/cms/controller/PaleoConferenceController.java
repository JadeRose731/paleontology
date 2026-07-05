package com.chuanghai.paleo.cms.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.chuanghai.paleo.cms.common.AjaxResult;
import com.chuanghai.paleo.cms.common.BaseController;
import com.chuanghai.paleo.cms.common.TableDataInfo;
import com.chuanghai.paleo.cms.domain.PaleoConference;
import com.chuanghai.paleo.cms.domain.PaleoConferenceRegistration;
import com.chuanghai.paleo.cms.security.LoginUser;
import com.chuanghai.paleo.cms.security.RequireAdminRole;
import com.chuanghai.paleo.cms.service.AdminScopeService;
import com.chuanghai.paleo.cms.mapper.PaleoConferenceMapper;
import com.chuanghai.paleo.cms.service.LocalFileStorageService;
import com.chuanghai.paleo.cms.service.PaleoConferenceRegistrationService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Api(tags = "会议报名")
@RestController
@RequestMapping("/paleo/conferences")
public class PaleoConferenceController extends BaseController {

    @Autowired
    private PaleoConferenceRegistrationService registrationService;

    @Autowired
    private PaleoConferenceMapper conferenceMapper;

    @Autowired
    private LocalFileStorageService fileStorageService;

    @Autowired
    private AdminScopeService adminScopeService;

    @ApiOperation("公开-开放会议列表")
    @GetMapping("/public/list")
    public AjaxResult publicList() {
        List<PaleoConference> list = conferenceMapper.selectList(new LambdaQueryWrapper<PaleoConference>()
                .eq(PaleoConference::getStatus, "OPEN")
                .orderByDesc(PaleoConference::getStartDate));
        return success(list);
    }

    @ApiOperation("我的会议报名")
    @GetMapping("/registrations/mine")
    public AjaxResult myRegistrations() {
        Long userId = getUserId();
        if (userId == null) {
            return error("未登录");
        }
        return success(registrationService.listMine(userId));
    }

    @RequireAdminRole({"super_admin", "branch_admin", "finance_reviewer"})
    @ApiOperation("管理端-会议报名列表")
    @GetMapping("/registrations/list")
    public TableDataInfo registrationList(PaleoConferenceRegistration query,
                                          @RequestParam(defaultValue = "1") int pageNum,
                                          @RequestParam(defaultValue = "20") int pageSize) {
        LoginUser user = currentUser();
        LambdaQueryWrapper<PaleoConferenceRegistration> wrapper = registrationService.adminScopeWrapper(user)
                .eq(query.getConferenceId() != null, PaleoConferenceRegistration::getConferenceId, query.getConferenceId())
                .eq(query.getUserId() != null, PaleoConferenceRegistration::getUserId, query.getUserId())
                .eq(StringUtils.hasText(query.getPaymentStatus()), PaleoConferenceRegistration::getPaymentStatus, query.getPaymentStatus())
                .orderByDesc(PaleoConferenceRegistration::getCreateTime);
        Page<PaleoConferenceRegistration> page = registrationService.page(new Page<>(pageNum, pageSize), wrapper);
        page.getRecords().forEach(registrationService::enrichRegistration);
        return getDataTable(page);
    }

    @ApiOperation("创建/获取我的会议报名记录")
    @PostMapping("/registrations/mine")
    public AjaxResult createMyRegistration(@RequestBody Map<String, Object> body) {
        Long userId = getUserId();
        if (userId == null) {
            return error("未登录");
        }
        try {
            String conferenceCode = stringVal(body.get("conferenceCode"));
            String feeType = stringVal(body.get("feeType"));
            BigDecimal feeAmount = body.get("feeAmount") != null
                    ? new BigDecimal(String.valueOf(body.get("feeAmount")))
                    : null;
            PaleoConferenceRegistration reg = registrationService.getOrCreate(
                    userId, conferenceCode, feeType, feeAmount, getUsername());
            return success(reg);
        } catch (IllegalArgumentException e) {
            return error(e.getMessage());
        }
    }

    @ApiOperation("上传我的会议费文件")
    @PostMapping("/registrations/mine/{registrationId}/files/{fileRole}")
    public AjaxResult uploadMyRegistrationFile(@PathVariable Long registrationId,
                                               @PathVariable String fileRole,
                                               @RequestParam("file") MultipartFile file) {
        Long userId = getUserId();
        if (userId == null) {
            return error("未登录");
        }
        PaleoConferenceRegistration reg = registrationService.getMine(userId, registrationId);
        if (reg == null) {
            return error("无权上传该会议报名文件");
        }
        try {
            LocalFileStorageService.StoredFile stored = fileStorageService.store(file);
            boolean updated = registrationService.attachFile(registrationId, fileRole, stored.url, getUsername());
            AjaxResult ajax = toAjax(updated);
            ajax.put("url", stored.url);
            ajax.put("fileName", stored.originalName);
            ajax.put("registration", registrationService.getMine(userId, registrationId));
            return ajax;
        } catch (Exception e) {
            return error(e.getMessage());
        }
    }

    @RequireAdminRole({"super_admin", "branch_admin", "finance_reviewer"})
    @ApiOperation("管理端-审核会议费")
    @PostMapping("/registrations/{registrationId}/review")
    public AjaxResult reviewRegistration(@PathVariable Long registrationId, @RequestBody Map<String, String> body) {
        try {
            registrationService.assertCanAccessRegistration(currentUser(), registrationId);
        } catch (Exception ex) {
            return error(ex.getMessage());
        }
        return toAjax(registrationService.review(
                registrationId,
                body.get("paymentStatus"),
                body.get("reviewComment"),
                getUsername()));
    }

    @RequireAdminRole({"super_admin", "branch_admin", "finance_reviewer"})
    @ApiOperation("管理端-待审凭证（会议费）")
    @GetMapping("/registrations/reviews/pending-vouchers")
    public AjaxResult pendingVoucherReviews() {
        return success(registrationService.listPendingReviewsForAdmin(currentUser(), "voucher"));
    }

    @RequireAdminRole({"super_admin", "branch_admin", "finance_reviewer"})
    @ApiOperation("管理端-待审发票（会议费）")
    @GetMapping("/registrations/reviews/pending-invoices")
    public AjaxResult pendingInvoiceReviews() {
        return success(registrationService.listPendingReviewsForAdmin(currentUser(), "invoice"));
    }

    private String stringVal(Object value) {
        return value != null && StringUtils.hasText(String.valueOf(value)) ? String.valueOf(value) : null;
    }
}
