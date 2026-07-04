package com.chuanghai.paleo.cms.controller;

import com.chuanghai.paleo.cms.common.AjaxResult;
import com.chuanghai.paleo.cms.service.PaleoDashboardService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Api(tags = "仪表盘统计")
@RestController
@RequestMapping("/paleo/dashboard")
public class PaleoDashboardController {

    @Autowired
    private PaleoDashboardService dashboardService;

    @ApiOperation("仪表盘综合统计")
    @GetMapping("/stats")
    public AjaxResult stats() {
        return AjaxResult.success(dashboardService.getDashboardStats());
    }
}
