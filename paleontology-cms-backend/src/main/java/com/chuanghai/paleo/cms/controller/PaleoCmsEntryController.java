package com.chuanghai.paleo.cms.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.chuanghai.paleo.cms.common.AjaxResult;
import com.chuanghai.paleo.cms.common.BaseController;
import com.chuanghai.paleo.cms.common.TableDataInfo;
import com.chuanghai.paleo.cms.domain.PaleoCmsEntry;
import com.chuanghai.paleo.cms.common.AuditAction;
import com.chuanghai.paleo.cms.security.Anonymous;
import com.chuanghai.paleo.cms.security.LoginUser;
import com.chuanghai.paleo.cms.service.AdminScopeService;
import com.chuanghai.paleo.cms.service.AuditLogService;
import com.chuanghai.paleo.cms.service.LocalFileStorageService;
import com.chuanghai.paleo.cms.service.PaleoCmsEntryService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Map;

@Api(tags = "完整CMS内容")
@RestController
@RequestMapping("/paleo/cms")
public class PaleoCmsEntryController extends BaseController {

    @Autowired
    private PaleoCmsEntryService cmsEntryService;

    @Autowired
    private AdminScopeService adminScopeService;

    @Autowired
    private LocalFileStorageService fileStorageService;

    @Autowired
    private AuditLogService auditLogService;

    @ApiOperation("管理端-分页列表")
    @GetMapping("/list")
    public TableDataInfo list(PaleoCmsEntry query,
                              @RequestParam(defaultValue = "1") int pageNum,
                              @RequestParam(defaultValue = "20") int pageSize) {
        LoginUser user = currentUser();
        LambdaQueryWrapper<PaleoCmsEntry> wrapper = baseQuery(query)
                .orderByDesc(PaleoCmsEntry::getPinned)
                .orderByAsc(PaleoCmsEntry::getSortOrder)
                .orderByDesc(PaleoCmsEntry::getPublishTime)
                .orderByDesc(PaleoCmsEntry::getCreateTime);

        if (user != null && adminScopeService.isBranchAdmin(user)) {
            List<Long> accessible = adminScopeService.resolveAccessibleAssociationIds(user);
            if (accessible.isEmpty()) {
                return getDataTable(Collections.emptyList());
            }
            wrapper.in(PaleoCmsEntry::getAssociationId, accessible);
        }

        Page<PaleoCmsEntry> page = cmsEntryService.page(new Page<>(pageNum, pageSize), wrapper);
        return getDataTable(page);
    }

    @ApiOperation("管理端-详情")
    @GetMapping("/{entryId}")
    public AjaxResult info(@PathVariable Long entryId) {
        PaleoCmsEntry entry = cmsEntryService.getById(entryId);
        LoginUser user = currentUser();
        if (entry == null || "1".equals(entry.getDeleted())
                || !adminScopeService.canAccessAssociation(user, entry.getAssociationId())) {
            return error("无权查看该内容");
        }
        return success(entry);
    }

    @Anonymous
    @ApiOperation("公开-列表")
    @GetMapping("/public/list")
    public AjaxResult publicList(PaleoCmsEntry query) {
        return success(cmsEntryService.list(baseQuery(query)
                .eq(PaleoCmsEntry::getStatus, "PUBLISHED")
                .orderByDesc(PaleoCmsEntry::getPinned)
                .orderByAsc(PaleoCmsEntry::getSortOrder)
                .orderByDesc(PaleoCmsEntry::getPublishTime)));
    }

    @Anonymous
    @ApiOperation("公开-详情")
    @GetMapping("/public/{entryId}")
    public AjaxResult publicInfo(@PathVariable Long entryId) {
        PaleoCmsEntry entry = cmsEntryService.getById(entryId);
        if (entry == null || "1".equals(entry.getDeleted()) || !"PUBLISHED".equals(entry.getStatus())) {
            return error("内容不存在或已下架");
        }
        return success(entry);
    }

    @ApiOperation("新增")
    @PostMapping
    public AjaxResult add(@RequestBody PaleoCmsEntry entry) {
        LoginUser user = currentUser();
        try {
            adminScopeService.assertCanWriteCms(user);
            if (!adminScopeService.canAccessAssociation(user, entry.getAssociationId())) {
                return error("无权新增该学会/分会内容");
            }
        } catch (Exception ex) {
            return error(ex.getMessage());
        }
        normalizeEntry(entry, true);
        entry.setCreateBy(getUsername());
        cmsEntryService.save(entry);
        return success(entry);
    }

    @ApiOperation("修改")
    @PutMapping
    public AjaxResult edit(@RequestBody PaleoCmsEntry entry) {
        LoginUser user = currentUser();
        try {
            adminScopeService.assertCanWriteCms(user);
            PaleoCmsEntry old = cmsEntryService.getById(entry.getEntryId());
            if (old == null || "1".equals(old.getDeleted())
                    || !adminScopeService.canAccessAssociation(user, old.getAssociationId())
                    || !adminScopeService.canAccessAssociation(user, entry.getAssociationId())) {
                return error("无权修改该内容");
            }
        } catch (Exception ex) {
            return error(ex.getMessage());
        }
        entry.setUpdateBy(getUsername());
        return toAjax(cmsEntryService.updateById(entry));
    }

    @ApiOperation("媒体上传")
    @PostMapping("/media/upload")
    public AjaxResult uploadMedia(@RequestParam(required = false) String title,
                                  @RequestParam(required = false) String category,
                                  @RequestParam(required = false) Long associationId,
                                  @RequestParam("file") MultipartFile file) {
        LoginUser user = currentUser();
        try {
            adminScopeService.assertCanWriteCms(user);
            if (!adminScopeService.canAccessAssociation(user, associationId)) {
                return error("无权上传该学会/分会媒体");
            }
        } catch (Exception ex) {
            return error(ex.getMessage());
        }
        try {
            LocalFileStorageService.StoredFile stored = fileStorageService.store(file);
            PaleoCmsEntry entry = new PaleoCmsEntry();
            entry.setAssociationId(associationId);
            entry.setModuleCode("media");
            entry.setColumnCode(fileStorageService.resolveMediaColumn(stored.extension));
            entry.setScope(associationId == null ? "society" : "branch");
            entry.setTitle(StringUtils.hasText(title) ? title.trim() : removeExtension(stored.originalName));
            entry.setCategory(category);
            entry.setMediaUrl(stored.url);
            entry.setFileUrl(stored.url);
            entry.setFileExtension(stored.extension);
            entry.setFileSize(stored.size);
            entry.setRefCount(0);
            entry.setStatus("PUBLISHED");
            entry.setDeleted("0");
            entry.setPinned("0");
            entry.setMemberOnly("0");
            entry.setSortOrder(0);
            entry.setPublishTime(new Date());
            entry.setCreateBy(getUsername());
            cmsEntryService.save(entry);
            AjaxResult ajax = success("上传成功");
            ajax.put("data", entry);
            return ajax;
        } catch (IllegalArgumentException ex) {
            return error(ex.getMessage());
        } catch (Exception ex) {
            return error("上传失败: " + ex.getMessage());
        }
    }

    @ApiOperation("更新状态")
    @PostMapping("/{entryId}/status")
    public AjaxResult updateStatus(@PathVariable Long entryId, @RequestBody Map<String, String> body) {
        LoginUser user = currentUser();
        PaleoCmsEntry entry = cmsEntryService.getById(entryId);
        try {
            adminScopeService.assertCanWriteCms(user);
            if (entry == null || "1".equals(entry.getDeleted())
                    || !adminScopeService.canAccessAssociation(user, entry.getAssociationId())) {
                return error("无权修改该内容状态");
            }
        } catch (Exception ex) {
            return error(ex.getMessage());
        }
        String status = body == null ? null : body.get("status");
        if (!"DRAFT".equals(status) && !"PUBLISHED".equals(status) && !"ARCHIVED".equals(status)) {
            return error("状态仅支持 DRAFT/PUBLISHED/ARCHIVED");
        }
        String beforeStatus = entry.getStatus();
        entry.setStatus(status);
        entry.setUpdateBy(getUsername());
        boolean ok = cmsEntryService.updateById(entry);
        if (ok && !status.equals(beforeStatus)) {
            String action = "PUBLISHED".equals(status) ? AuditAction.CMS_PUBLISH : AuditAction.CMS_UNPUBLISH;
            Map<String, Object> detail = auditLogService.cmsContentDetailSnapshot(entry.getTitle(), beforeStatus, status);
            auditLogService.log(user, action, "cms", String.valueOf(entryId), entry.getAssociationId(),
                    String.format("CMS 内容状态变更：%s → %s（%s）",
                            detail.get("statusBefore"), detail.get("statusAfter"), entry.getTitle()),
                    detail);
        }
        return toAjax(ok);
    }

    @ApiOperation("逻辑删除")
    @PostMapping("/{entryId}/delete")
    public AjaxResult delete(@PathVariable Long entryId) {
        LoginUser user = currentUser();
        PaleoCmsEntry entry = cmsEntryService.getById(entryId);
        try {
            adminScopeService.assertCanWriteCms(user);
            if (entry == null || "1".equals(entry.getDeleted())
                    || !adminScopeService.canAccessAssociation(user, entry.getAssociationId())) {
                return error("无权删除该内容");
            }
        } catch (Exception ex) {
            return error(ex.getMessage());
        }
        if ("media".equals(entry.getModuleCode()) && entry.getRefCount() != null && entry.getRefCount() > 0) {
            return error("该媒体已被引用，不能删除");
        }
        entry.setDeleted("1");
        entry.setStatus("ARCHIVED");
        entry.setUpdateBy(getUsername());
        return toAjax(cmsEntryService.updateById(entry));
    }

    private LambdaQueryWrapper<PaleoCmsEntry> baseQuery(PaleoCmsEntry query) {
        LambdaQueryWrapper<PaleoCmsEntry> wrapper = new LambdaQueryWrapper<PaleoCmsEntry>()
                .ne(PaleoCmsEntry::getDeleted, "1");
        if (query == null) {
            return wrapper;
        }
        return wrapper
                .eq(query.getEntryId() != null, PaleoCmsEntry::getEntryId, query.getEntryId())
                .eq(query.getAssociationId() != null, PaleoCmsEntry::getAssociationId, query.getAssociationId())
                .eq(StringUtils.hasText(query.getModuleCode()), PaleoCmsEntry::getModuleCode, query.getModuleCode())
                .eq(StringUtils.hasText(query.getColumnCode()), PaleoCmsEntry::getColumnCode, query.getColumnCode())
                .eq(StringUtils.hasText(query.getScope()), PaleoCmsEntry::getScope, query.getScope())
                .eq(StringUtils.hasText(query.getCategory()), PaleoCmsEntry::getCategory, query.getCategory())
                .eq(StringUtils.hasText(query.getStatus()), PaleoCmsEntry::getStatus, query.getStatus())
                .like(StringUtils.hasText(query.getTitle()), PaleoCmsEntry::getTitle, query.getTitle());
    }

    private void normalizeEntry(PaleoCmsEntry entry, boolean isNew) {
        if (entry.getStatus() == null) {
            entry.setStatus("DRAFT");
        }
        entry.setDeleted("0");
        if (entry.getPinned() == null) {
            entry.setPinned("0");
        }
        if (entry.getMemberOnly() == null) {
            entry.setMemberOnly("0");
        }
        if (entry.getRefCount() == null) {
            entry.setRefCount(0);
        }
        if (entry.getSortOrder() == null) {
            entry.setSortOrder(0);
        }
        if (isNew && entry.getPublishTime() == null) {
            entry.setPublishTime(new Date());
        }
    }

    private String removeExtension(String fileName) {
        if (!StringUtils.hasText(fileName)) {
            return "媒体文件";
        }
        int dot = fileName.lastIndexOf('.');
        return dot > 0 ? fileName.substring(0, dot) : fileName;
    }
}
