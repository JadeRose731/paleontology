package com.chuanghai.paleo.cms.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.chuanghai.paleo.cms.common.AjaxResult;
import com.chuanghai.paleo.cms.common.BaseController;
import com.chuanghai.paleo.cms.common.TableDataInfo;
import com.chuanghai.paleo.cms.security.LoginUser;
import com.chuanghai.paleo.cms.security.RequireAdminRole;
import com.chuanghai.paleo.cms.service.PaleoRecognitionService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@Api(tags = "识别结果")
@RestController
@RequestMapping("/paleo/recognition")
@RequireAdminRole({"super_admin", "branch_admin"})
public class PaleoRecognitionController extends BaseController {

    @Autowired
    private PaleoRecognitionService recognitionService;

    @ApiOperation("识别结果分页列表")
    @GetMapping("/list")
    public TableDataInfo list(@RequestParam(defaultValue = "1") int pageNum,
                              @RequestParam(defaultValue = "20") int pageSize,
                              @RequestParam(required = false) String status,
                              @RequestParam(required = false) String targetType,
                              @RequestParam(required = false) String manualStatus) {
        LoginUser user = currentUser();
        Page<Map<String, Object>> page = recognitionService.listForAdmin(
                user, pageNum, pageSize, status, targetType, manualStatus);
        return getDataTable(page);
    }

    @ApiOperation("识别结果详情")
    @GetMapping("/{id}")
    public AjaxResult detail(@PathVariable Long id) {
        try {
            return success(recognitionService.getDetailForAdmin(currentUser(), id));
        } catch (Exception ex) {
            return error(ex.getMessage());
        }
    }

    @ApiOperation("人工复核")
    @PostMapping("/{id}/review")
    public AjaxResult review(@PathVariable Long id, @RequestBody Map<String, String> body) {
        try {
            boolean ok = recognitionService.manualReview(
                    currentUser(),
                    id,
                    body.get("manualStatus"),
                    body.get("manualComment"));
            return toAjax(ok);
        } catch (IllegalArgumentException ex) {
            return error(ex.getMessage());
        } catch (Exception ex) {
            return error(ex.getMessage());
        }
    }
}
