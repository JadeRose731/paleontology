package com.chuanghai.paleo.cms.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.chuanghai.paleo.cms.common.AjaxResult;
import com.chuanghai.paleo.cms.common.BaseController;
import com.chuanghai.paleo.cms.common.TableDataInfo;
import com.chuanghai.paleo.cms.domain.PaleoMemberProfile;
import com.chuanghai.paleo.cms.domain.PaleoMembershipApplication;
import com.chuanghai.paleo.cms.domain.PaleoMembershipPayment;
import com.chuanghai.paleo.cms.domain.PaleoUser;
import com.chuanghai.paleo.cms.service.LocalFileStorageService;
import com.chuanghai.paleo.cms.service.PaleoMemberProfileService;
import com.chuanghai.paleo.cms.service.PaleoMembershipApplicationService;
import com.chuanghai.paleo.cms.service.PaleoMembershipDirectoryService;
import com.chuanghai.paleo.cms.service.PaleoMembershipPaymentService;
import com.chuanghai.paleo.cms.domain.PaleoMembershipTemplate;
import com.chuanghai.paleo.cms.security.LoginUser;
import com.chuanghai.paleo.cms.security.RequireAdminRole;
import com.chuanghai.paleo.cms.service.AdminScopeService;
import com.chuanghai.paleo.cms.service.PaleoMembershipTemplateService;
import com.chuanghai.paleo.cms.service.PaleoUserService;
import com.chuanghai.paleo.cms.security.Anonymous;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Api(tags = "会员业务")
@RestController
@RequestMapping("/paleo/membership")
public class PaleoMembershipController extends BaseController {

    @Autowired
    private PaleoMemberProfileService memberProfileService;

    @Autowired
    private PaleoMembershipApplicationService applicationService;

    @Autowired
    private PaleoMembershipPaymentService paymentService;

    @Autowired
    private LocalFileStorageService fileStorageService;

    @Autowired
    private PaleoUserService userService;

    @Autowired
    private PaleoMembershipDirectoryService directoryService;

    @Autowired
    private PaleoMembershipTemplateService templateService;

    @Autowired
    private AdminScopeService adminScopeService;

    @Anonymous
    @ApiOperation("公开-入会/退会申请书模板")
    @GetMapping("/templates/public")
    public AjaxResult publicTemplates() {
        return success(templateService.getPublicTemplates());
    }

    @ApiOperation("管理端-入会/退会申请书模板")
    @GetMapping("/templates")
    public AjaxResult adminTemplates() {
        return success(templateService.getPublicTemplates());
    }

    @ApiOperation("管理端-上传入会/退会申请书模板")
    @PostMapping("/templates/{templateType}/upload")
    public AjaxResult uploadTemplate(@PathVariable String templateType,
                                     @RequestParam("file") MultipartFile file) {
        try {
            String normalized = PaleoMembershipTemplateService.normalizeTemplateType(templateType);
            LocalFileStorageService.StoredFile stored = fileStorageService.store(file);
            PaleoMembershipTemplate saved = templateService.upsert(
                    normalized, stored.originalName, stored.url, getUsername());
            AjaxResult ajax = success("模板上传成功");
            ajax.put("data", saved);
            return ajax;
        } catch (IllegalArgumentException ex) {
            return error(ex.getMessage());
        } catch (Exception ex) {
            return error("模板上传失败: " + ex.getMessage());
        }
    }

    @RequireAdminRole({"super_admin", "branch_admin", "finance_reviewer"})
    @ApiOperation("管理端-用户会员目录")
    @GetMapping("/admin/directory")
    public AjaxResult memberDirectory() {
        return success(directoryService.listDirectoryForAdmin(currentUser()));
    }

    @RequireAdminRole({"super_admin", "finance_reviewer"})
    @ApiOperation("管理端-指定用户的会员费记录")
    @GetMapping("/admin/users/{userId}/payments")
    public AjaxResult userMembershipPayments(@PathVariable Long userId) {
        List<PaleoMembershipPayment> list = paymentService.list(new LambdaQueryWrapper<PaleoMembershipPayment>()
                .eq(PaleoMembershipPayment::getUserId, userId)
                .orderByDesc(PaleoMembershipPayment::getCreateTime))
                .stream()
                .filter(paymentService::isDisplayable)
                .collect(Collectors.toList());
        return success(enrichPayments(list));
    }

    @ApiOperation("管理端-会员档案列表")
    @GetMapping("/profiles/list")
    public TableDataInfo profileList(PaleoMemberProfile query,
                                     @RequestParam(defaultValue = "1") int pageNum,
                                     @RequestParam(defaultValue = "20") int pageSize) {
        Page<PaleoMemberProfile> page = memberProfileService.page(new Page<>(pageNum, pageSize),
                new LambdaQueryWrapper<PaleoMemberProfile>()
                        .eq(query.getUserId() != null, PaleoMemberProfile::getUserId, query.getUserId())
                        .eq(StringUtils.hasText(query.getMemberStatus()), PaleoMemberProfile::getMemberStatus, query.getMemberStatus())
                        .eq(StringUtils.hasText(query.getMemberCategory()), PaleoMemberProfile::getMemberCategory, query.getMemberCategory())
                        .orderByDesc(PaleoMemberProfile::getUpdateTime));
        return getDataTable(page);
    }

    @ApiOperation("我的会员档案")
    @GetMapping("/profiles/mine")
    public AjaxResult myProfile() {
        Long userId = getUserId();
        if (userId == null) return error("未登录");
        return success(memberProfileService.getOrCreate(userId, getUsername()));
    }

    @ApiOperation("更新我的会员类别")
    @PutMapping("/profiles/mine")
    public AjaxResult updateMyProfile(@RequestBody PaleoMemberProfile profile) {
        Long userId = getUserId();
        if (userId == null) return error("未登录");
        return toAjax(memberProfileService.updateMineCategory(userId, profile.getMemberCategory(), getUsername()));
    }

    @RequireAdminRole("super_admin")
    @ApiOperation("管理端-入会/退会申请列表")
    @GetMapping("/applications/list")
    public TableDataInfo applicationList(PaleoMembershipApplication query,
                                         @RequestParam(defaultValue = "1") int pageNum,
                                         @RequestParam(defaultValue = "20") int pageSize) {
        Page<PaleoMembershipApplication> page = applicationService.page(new Page<>(pageNum, pageSize),
                new LambdaQueryWrapper<PaleoMembershipApplication>()
                        .eq(query.getUserId() != null, PaleoMembershipApplication::getUserId, query.getUserId())
                        .eq(StringUtils.hasText(query.getApplicationType()), PaleoMembershipApplication::getApplicationType, query.getApplicationType())
                        .eq(StringUtils.hasText(query.getReviewStatus()), PaleoMembershipApplication::getReviewStatus, query.getReviewStatus())
                        .orderByDesc(PaleoMembershipApplication::getCreateTime));
        return getDataTable(page);
    }

    @ApiOperation("我的入会/退会申请")
    @GetMapping("/applications/mine")
    public AjaxResult myApplications(PaleoMembershipApplication query) {
        Long userId = getUserId();
        if (userId == null) return error("未登录");
        List<PaleoMembershipApplication> list = applicationService.list(new LambdaQueryWrapper<PaleoMembershipApplication>()
                .eq(PaleoMembershipApplication::getUserId, userId)
                .eq(StringUtils.hasText(query.getApplicationType()), PaleoMembershipApplication::getApplicationType, query.getApplicationType())
                .eq(StringUtils.hasText(query.getReviewStatus()), PaleoMembershipApplication::getReviewStatus, query.getReviewStatus())
                .orderByDesc(PaleoMembershipApplication::getCreateTime));
        return success(list);
    }

    @ApiOperation("申请详情")
    @GetMapping("/applications/{applicationId}")
    public AjaxResult applicationInfo(@PathVariable Long applicationId) {
        return success(applicationService.getById(applicationId));
    }

    @ApiOperation("提交我的入会/退会申请")
    @PostMapping("/applications/mine")
    public AjaxResult addMyApplication(@RequestBody PaleoMembershipApplication application) {
        Long userId = getUserId();
        if (userId == null) return error("未登录");
        application.setApplicationId(null);
        application.setUserId(userId);
        application.setReviewStatus("PENDING");
        application.setCreateBy(getUsername());
        if (!StringUtils.hasText(application.getApplicationType())) {
            application.setApplicationType("JOIN");
        }
        try {
            PaleoMembershipApplication created = applicationService.createMine(application);
            return success(created);
        } catch (IllegalArgumentException e) {
            return error(e.getMessage());
        }
    }

    @RequireAdminRole("super_admin")
    @ApiOperation("管理端-审核入会/退会申请")
    @PostMapping("/applications/{applicationId}/review")
    public AjaxResult reviewApplication(@PathVariable Long applicationId, @RequestBody Map<String, String> body) {
        return toAjax(applicationService.review(
                applicationId,
                body.get("reviewStatus"),
                body.get("reviewComment"),
                getUsername()));
    }

    @ApiOperation("上传我的申请书")
    @PostMapping("/applications/mine/{applicationId}/file")
    public AjaxResult uploadMyApplicationFile(@PathVariable Long applicationId, @RequestParam("file") MultipartFile file) {
        Long userId = getUserId();
        if (userId == null) return error("未登录");
        PaleoMembershipApplication application = applicationService.getById(applicationId);
        if (application == null || !userId.equals(application.getUserId())) {
            return error("无权上传该申请书");
        }
        try {
            LocalFileStorageService.StoredFile stored = fileStorageService.store(file);
            boolean updated = applicationService.attachApplicationFile(applicationId, stored.url, getUsername());
            AjaxResult ajax = toAjax(updated);
            ajax.put("url", stored.url);
            ajax.put("fileName", stored.originalName);
            return ajax;
        } catch (Exception e) {
            return error(e.getMessage());
        }
    }

    @ApiOperation("撤回我的入会/退会申请")
    @PostMapping("/applications/mine/{applicationId}/cancel")
    public AjaxResult cancelMyApplication(@PathVariable Long applicationId) {
        Long userId = getUserId();
        if (userId == null) return error("未登录");
        try {
            return toAjax(applicationService.cancelMine(userId, applicationId));
        } catch (IllegalArgumentException e) {
            return error(e.getMessage());
        }
    }

    @RequireAdminRole("super_admin")
    @ApiOperation("管理端-待审入会/退会申请")
    @GetMapping("/applications/reviews/pending")
    public AjaxResult pendingApplications(@RequestParam(required = false) String applicationType) {
        return success(enrichApplications(applicationService.listPending(applicationType)));
    }

    @RequireAdminRole({"super_admin", "finance_reviewer"})
    @ApiOperation("管理端-会员费列表")
    @GetMapping("/payments/list")
    public TableDataInfo paymentList(PaleoMembershipPayment query,
                                     @RequestParam(defaultValue = "1") int pageNum,
                                     @RequestParam(defaultValue = "20") int pageSize) {
        Page<PaleoMembershipPayment> page = paymentService.page(new Page<>(pageNum, pageSize),
                new LambdaQueryWrapper<PaleoMembershipPayment>()
                        .eq(query.getUserId() != null, PaleoMembershipPayment::getUserId, query.getUserId())
                        .eq(query.getApplicationId() != null, PaleoMembershipPayment::getApplicationId, query.getApplicationId())
                        .eq(StringUtils.hasText(query.getPaymentStatus()), PaleoMembershipPayment::getPaymentStatus, query.getPaymentStatus())
                        .orderByDesc(PaleoMembershipPayment::getCreateTime));
        return getDataTable(page);
    }

    @ApiOperation("我的会员费记录")
    @GetMapping("/payments/mine")
    public AjaxResult myPayments(PaleoMembershipPayment query) {
        Long userId = getUserId();
        if (userId == null) return error("未登录");
        List<PaleoMembershipPayment> list = paymentService.list(new LambdaQueryWrapper<PaleoMembershipPayment>()
                .eq(PaleoMembershipPayment::getUserId, userId)
                .eq(query.getApplicationId() != null, PaleoMembershipPayment::getApplicationId, query.getApplicationId())
                .eq(StringUtils.hasText(query.getPaymentStatus()), PaleoMembershipPayment::getPaymentStatus, query.getPaymentStatus())
                .orderByDesc(PaleoMembershipPayment::getCreateTime));
        return success(list);
    }

    @ApiOperation("会员费详情")
    @GetMapping("/payments/{paymentId}")
    public AjaxResult paymentInfo(@PathVariable Long paymentId) {
        return success(paymentService.getById(paymentId));
    }

    @ApiOperation("提交我的会员费")
    @PostMapping("/payments/mine")
    public AjaxResult addMyPayment(@RequestBody PaleoMembershipPayment payment) {
        Long userId = getUserId();
        if (userId == null) return error("未登录");
        payment.setUserId(userId);
        return success(paymentService.getOrCreateDraft(payment, getUsername()));
    }

    @RequireAdminRole({"super_admin", "finance_reviewer"})
    @ApiOperation("管理端-审核会员费")
    @PostMapping("/payments/{paymentId}/review")
    public AjaxResult reviewPayment(@PathVariable Long paymentId, @RequestBody Map<String, String> body) {
        return toAjax(paymentService.review(
                paymentId,
                body.get("paymentStatus"),
                body.get("reviewComment"),
                getUsername()));
    }

    @ApiOperation("上传我的会员费文件")
    @PostMapping("/payments/mine/{paymentId}/files/{fileRole}")
    public AjaxResult uploadMyPaymentFile(@PathVariable Long paymentId,
                                          @PathVariable String fileRole,
                                          @RequestParam("file") MultipartFile file) {
        Long userId = getUserId();
        if (userId == null) return error("未登录");
        PaleoMembershipPayment payment = paymentService.getById(paymentId);
        if (payment == null || !userId.equals(payment.getUserId())) {
            return error("无权上传该会员费文件");
        }
        try {
            LocalFileStorageService.StoredFile stored = fileStorageService.store(file);
            boolean updated = paymentService.attachFile(paymentId, fileRole, stored.url, getUsername());
            AjaxResult ajax = toAjax(updated);
            ajax.put("url", stored.url);
            ajax.put("fileName", stored.originalName);
            return ajax;
        } catch (Exception e) {
            return error(e.getMessage());
        }
    }

    @ApiOperation("会员费统计")
    @GetMapping("/payments/stats")
    public AjaxResult paymentStats() {
        return success(paymentService.getMembershipPaymentStats());
    }

    @RequireAdminRole({"super_admin", "finance_reviewer"})
    @ApiOperation("管理端-待审凭证（会员费）")
    @GetMapping("/payments/reviews/pending-vouchers")
    public AjaxResult pendingMembershipVoucherReviews() {
        return success(enrichPayments(paymentService.listPendingReviews("voucher")));
    }

    @RequireAdminRole({"super_admin", "finance_reviewer"})
    @ApiOperation("管理端-待审发票（会员费）")
    @GetMapping("/payments/reviews/pending-invoices")
    public AjaxResult pendingMembershipInvoiceReviews() {
        return success(enrichPayments(paymentService.listPendingReviews("invoice")));
    }

    private List<Map<String, Object>> enrichApplications(List<PaleoMembershipApplication> applications) {
        List<Map<String, Object>> rows = new ArrayList<>();
        for (PaleoMembershipApplication application : applications) {
            Map<String, Object> row = new HashMap<>();
            row.put("applicationId", application.getApplicationId());
            row.put("userId", application.getUserId());
            row.put("applicationType", application.getApplicationType());
            row.put("memberCategory", application.getMemberCategory());
            row.put("applicantName", application.getApplicantName());
            row.put("applicantEmail", application.getApplicantEmail());
            row.put("applicationFileUrl", application.getApplicationFileUrl());
            row.put("reviewStatus", application.getReviewStatus());
            row.put("reviewComment", application.getReviewComment());
            row.put("createTime", application.getCreateTime());
            row.put("reviewTime", application.getReviewTime());
            PaleoUser user = userService.getById(application.getUserId());
            if (user != null) {
                row.put("userEmail", user.getEmail());
                row.put("userName", user.getUserName());
            }
            PaleoMemberProfile profile = memberProfileService.getOrCreate(application.getUserId(), "system");
            row.put("memberStatus", profile.getMemberStatus());
            row.put("validEndDate", profile.getValidEndDate());
            rows.add(row);
        }
        return rows;
    }

    private List<Map<String, Object>> enrichPayments(List<PaleoMembershipPayment> payments) {
        List<Map<String, Object>> rows = new ArrayList<>();
        for (PaleoMembershipPayment payment : payments) {
            Map<String, Object> row = new HashMap<>();
            row.put("paymentId", payment.getPaymentId());
            row.put("userId", payment.getUserId());
            row.put("memberCategory", payment.getMemberCategory());
            row.put("amount", payment.getAmount());
            row.put("paymentStatus", payment.getPaymentStatus());
            row.put("voucherUrl", payment.getVoucherUrl());
            row.put("invoiceUrl", payment.getInvoiceUrl());
            row.put("reviewComment", payment.getReviewComment());
            row.put("createTime", payment.getCreateTime());
            row.put("updateTime", payment.getUpdateTime());
            PaleoUser user = userService.getById(payment.getUserId());
            if (user != null) {
                row.put("userEmail", user.getEmail());
                row.put("userName", user.getUserName());
            }
            rows.add(row);
        }
        return rows;
    }
}
