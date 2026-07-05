package com.chuanghai.paleo.cms.controller;

import com.chuanghai.paleo.cms.common.AjaxResult;
import com.chuanghai.paleo.cms.common.BaseController;
import com.chuanghai.paleo.cms.service.PaleoUserBindingService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Api(tags = "用户分会绑定")
@RestController
@RequestMapping("/paleo/user-bindings")
public class PaleoUserBindingController extends BaseController {

    @Autowired
    private PaleoUserBindingService bindingService;

    @ApiOperation("我的分会绑定列表")
    @GetMapping("/mine")
    public AjaxResult myBindings() {
        Long userId = getUserId();
        if (userId == null) {
            return error("未登录");
        }
        List<String> branchCodes = bindingService.listMyBranchCodes(userId);
        return success(branchCodes);
    }

    @ApiOperation("绑定分会")
    @PostMapping("/mine/bind")
    public AjaxResult bind(@RequestBody Map<String, String> body) {
        Long userId = getUserId();
        if (userId == null) {
            return error("未登录");
        }
        String branchCode = body.get("branchCode");
        if (!StringUtils.hasText(branchCode)) {
            return error("分会编码不能为空");
        }
        try {
            bindingService.bind(userId, branchCode.trim());
            return success(bindingService.listMyBranchCodes(userId));
        } catch (IllegalArgumentException e) {
            return error(e.getMessage());
        }
    }

    @ApiOperation("解绑分会")
    @PostMapping("/mine/unbind")
    public AjaxResult unbind(@RequestBody Map<String, String> body) {
        Long userId = getUserId();
        if (userId == null) {
            return error("未登录");
        }
        String branchCode = body.get("branchCode");
        if (!StringUtils.hasText(branchCode)) {
            return error("分会编码不能为空");
        }
        try {
            bindingService.unbind(userId, branchCode.trim());
            return success(bindingService.listMyBranchCodes(userId));
        } catch (IllegalArgumentException e) {
            return error(e.getMessage());
        }
    }
}
