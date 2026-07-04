package com.chuanghai.paleo.cms.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.chuanghai.paleo.cms.common.AjaxResult;
import com.chuanghai.paleo.cms.common.BaseController;
import com.chuanghai.paleo.cms.domain.PaleoCmsLayout;
import com.chuanghai.paleo.cms.security.Anonymous;
import com.chuanghai.paleo.cms.service.PaleoCmsLayoutService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Api(tags = "CMS版式注册表")
@RestController
@RequestMapping("/paleo/cms-layouts")
public class PaleoCmsLayoutController extends BaseController {

    @Autowired
    private PaleoCmsLayoutService layoutService;

    @Anonymous
    @ApiOperation("公开-版式列表")
    @GetMapping("/public/list")
    public AjaxResult publicList() {
        return success(listPublished());
    }

    @ApiOperation("管理端-版式列表")
    @GetMapping("/list")
    public AjaxResult list() {
        return success(listPublished());
    }

    @Anonymous
    @ApiOperation("公开-版式详情含 Schema")
    @GetMapping("/public/{layoutCode}")
    public AjaxResult publicInfo(@PathVariable String layoutCode) {
        PaleoCmsLayout layout = layoutService.getById(layoutCode);
        if (layout == null || !"PUBLISHED".equals(layout.getStatus())) {
            return error("版式不存在或未发布");
        }
        return success(layout);
    }

    private List<PaleoCmsLayout> listPublished() {
        return layoutService.list(new LambdaQueryWrapper<PaleoCmsLayout>()
                .eq(PaleoCmsLayout::getStatus, "PUBLISHED")
                .orderByAsc(PaleoCmsLayout::getSortOrder));
    }
}
