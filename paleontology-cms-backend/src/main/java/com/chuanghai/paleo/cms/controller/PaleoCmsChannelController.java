package com.chuanghai.paleo.cms.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.chuanghai.paleo.cms.common.AjaxResult;
import com.chuanghai.paleo.cms.common.BaseController;
import com.chuanghai.paleo.cms.common.TableDataInfo;
import com.chuanghai.paleo.cms.domain.PaleoCmsBlock;
import com.chuanghai.paleo.cms.domain.PaleoCmsChannel;
import com.chuanghai.paleo.cms.security.Anonymous;
import com.chuanghai.paleo.cms.security.LoginUser;
import com.chuanghai.paleo.cms.service.CmsScopeService;
import com.chuanghai.paleo.cms.service.PaleoCmsBlockService;
import com.chuanghai.paleo.cms.service.PaleoCmsChannelService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Api(tags = "CMS栏目编排")
@RestController
@RequestMapping("/paleo/cms-channels")
public class PaleoCmsChannelController extends BaseController {

    @Autowired
    private PaleoCmsChannelService channelService;

    @Autowired
    private PaleoCmsBlockService blockService;

    @Autowired
    private CmsScopeService scopeService;

    @ApiOperation("管理端-栏目列表")
    @GetMapping("/list")
    public TableDataInfo list(PaleoCmsChannel query,
                              @RequestParam(defaultValue = "1") int pageNum,
                              @RequestParam(defaultValue = "50") int pageSize) {
        LoginUser user = currentUser();
        if (user != null && "branch_admin".equals(user.getRole()) && StringUtils.hasText(user.getBranchId())) {
            query.setAssociationId(Long.parseLong(user.getBranchId()));
        }
        Page<PaleoCmsChannel> page = channelService.page(new Page<>(pageNum, pageSize), channelQuery(query)
                .orderByAsc(PaleoCmsChannel::getSortOrder));
        return getDataTable(page);
    }

    @ApiOperation("管理端-栏目详情")
    @GetMapping("/{channelId}")
    public AjaxResult info(@PathVariable Long channelId) {
        PaleoCmsChannel channel = channelService.getById(channelId);
        LoginUser user = currentUser();
        if (channel == null || "1".equals(channel.getDeleted()) || !scopeService.canAccessAssociation(user, channel.getAssociationId())) {
            return error("栏目不存在或无权访问");
        }
        return success(channel);
    }

    @Anonymous
    @ApiOperation("公开-栏目列表")
    @GetMapping("/public/list")
    public AjaxResult publicList(PaleoCmsChannel query) {
        return success(channelService.list(channelQuery(query)
                .eq(PaleoCmsChannel::getVisible, "1")
                .eq(PaleoCmsChannel::getStatus, "PUBLISHED")
                .orderByAsc(PaleoCmsChannel::getSortOrder)));
    }

    @Anonymous
    @ApiOperation("公开-栏目详情含区块")
    @GetMapping("/public/detail")
    public AjaxResult publicDetail(@RequestParam(required = false) String routePath,
                                   @RequestParam(required = false) String channelCode) {
        if (!StringUtils.hasText(routePath) && !StringUtils.hasText(channelCode)) {
            return error("routePath 或 channelCode 至少传一个");
        }
        PaleoCmsChannel channel = channelService.getOne(channelQuery(new PaleoCmsChannel())
                .eq(StringUtils.hasText(routePath), PaleoCmsChannel::getRoutePath, routePath)
                .eq(StringUtils.hasText(channelCode), PaleoCmsChannel::getChannelCode, channelCode)
                .eq(PaleoCmsChannel::getVisible, "1")
                .eq(PaleoCmsChannel::getStatus, "PUBLISHED")
                .last("LIMIT 1"));
        if (channel == null) {
            return error("栏目不存在或未发布");
        }
        List<PaleoCmsBlock> blocks = blockService.list(new LambdaQueryWrapper<PaleoCmsBlock>()
                .eq(PaleoCmsBlock::getChannelId, channel.getChannelId())
                .eq(PaleoCmsBlock::getVisible, "1")
                .eq(PaleoCmsBlock::getStatus, "PUBLISHED")
                .ne(PaleoCmsBlock::getDeleted, "1")
                .orderByAsc(PaleoCmsBlock::getSortOrder));
        Map<String, Object> data = new HashMap<>();
        data.put("channel", channel);
        data.put("blocks", blocks);
        return success(data);
    }

    @ApiOperation("新增栏目")
    @PostMapping
    public AjaxResult add(@RequestBody PaleoCmsChannel channel) {
        LoginUser user = currentUser();
        if (!scopeService.canAccessAssociation(user, channel.getAssociationId())) {
            return error("无权新增该栏目");
        }
        normalizeChannel(channel, true);
        channel.setCreateBy(getUsername());
        return toAjax(channelService.save(channel));
    }

    @ApiOperation("修改栏目")
    @PutMapping
    public AjaxResult edit(@RequestBody PaleoCmsChannel channel) {
        LoginUser user = currentUser();
        PaleoCmsChannel old = channelService.getById(channel.getChannelId());
        if (old == null || "1".equals(old.getDeleted()) || !scopeService.canAccessAssociation(user, old.getAssociationId())) {
            return error("无权修改该栏目");
        }
        if ("1".equals(old.getLocked())) {
            channel.setChannelCode(old.getChannelCode());
            channel.setRoutePath(old.getRoutePath());
            channel.setLocked("1");
        }
        channel.setUpdateBy(getUsername());
        return toAjax(channelService.updateById(channel));
    }

    @ApiOperation("更新栏目状态")
    @PostMapping("/{channelId}/status")
    public AjaxResult updateStatus(@PathVariable Long channelId, @RequestBody Map<String, String> body) {
        LoginUser user = currentUser();
        PaleoCmsChannel channel = channelService.getById(channelId);
        if (channel == null || "1".equals(channel.getDeleted()) || !scopeService.canAccessAssociation(user, channel.getAssociationId())) {
            return error("无权修改栏目状态");
        }
        String status = body == null ? null : body.get("status");
        if (!"DRAFT".equals(status) && !"PUBLISHED".equals(status) && !"ARCHIVED".equals(status)) {
            return error("状态仅支持 DRAFT/PUBLISHED/ARCHIVED");
        }
        channel.setStatus(status);
        channel.setUpdateBy(getUsername());
        return toAjax(channelService.updateById(channel));
    }

    @ApiOperation("删除栏目")
    @PostMapping("/{channelId}/delete")
    public AjaxResult delete(@PathVariable Long channelId) {
        LoginUser user = currentUser();
        PaleoCmsChannel channel = channelService.getById(channelId);
        if (channel == null || "1".equals(channel.getDeleted()) || !scopeService.canAccessAssociation(user, channel.getAssociationId())) {
            return error("无权删除该栏目");
        }
        if ("1".equals(channel.getLocked())) {
            return error("定制页栏目不可删除");
        }
        channel.setDeleted("1");
        channel.setStatus("ARCHIVED");
        channel.setUpdateBy(getUsername());
        return toAjax(channelService.updateById(channel));
    }

    @ApiOperation("区块列表")
    @GetMapping("/{channelId}/blocks")
    public AjaxResult listBlocks(@PathVariable Long channelId) {
        LoginUser user = currentUser();
        PaleoCmsChannel channel = channelService.getById(channelId);
        if (channel == null || !scopeService.canAccessAssociation(user, channel.getAssociationId())) {
            return error("无权查看区块");
        }
        return success(blockService.list(new LambdaQueryWrapper<PaleoCmsBlock>()
                .eq(PaleoCmsBlock::getChannelId, channelId)
                .ne(PaleoCmsBlock::getDeleted, "1")
                .orderByAsc(PaleoCmsBlock::getSortOrder)));
    }

    @ApiOperation("保存区块")
    @PostMapping("/{channelId}/blocks")
    public AjaxResult saveBlock(@PathVariable Long channelId, @RequestBody PaleoCmsBlock block) {
        LoginUser user = currentUser();
        PaleoCmsChannel channel = channelService.getById(channelId);
        if (channel == null || !scopeService.canAccessAssociation(user, channel.getAssociationId())) {
            return error("无权维护区块");
        }
        block.setChannelId(channelId);
        if (block.getBlockId() == null) {
            block.setDeleted("0");
            if (block.getStatus() == null) {
                block.setStatus("DRAFT");
            }
            if (block.getVisible() == null) {
                block.setVisible("1");
            }
            block.setCreateBy(getUsername());
            blockService.save(block);
        } else {
            block.setUpdateBy(getUsername());
            blockService.updateById(block);
        }
        return success(block);
    }

    @ApiOperation("删除区块")
    @PostMapping("/blocks/{blockId}/delete")
    public AjaxResult deleteBlock(@PathVariable Long blockId) {
        PaleoCmsBlock block = blockService.getById(blockId);
        if (block == null) {
            return error("区块不存在");
        }
        PaleoCmsChannel channel = channelService.getById(block.getChannelId());
        LoginUser user = currentUser();
        if (channel == null || !scopeService.canAccessAssociation(user, channel.getAssociationId())) {
            return error("无权删除区块");
        }
        block.setDeleted("1");
        block.setStatus("ARCHIVED");
        block.setUpdateBy(getUsername());
        return toAjax(blockService.updateById(block));
    }

    private LambdaQueryWrapper<PaleoCmsChannel> channelQuery(PaleoCmsChannel query) {
        LambdaQueryWrapper<PaleoCmsChannel> wrapper = new LambdaQueryWrapper<PaleoCmsChannel>()
                .ne(PaleoCmsChannel::getDeleted, "1");
        if (query == null) {
            return wrapper;
        }
        return wrapper
                .eq(query.getChannelId() != null, PaleoCmsChannel::getChannelId, query.getChannelId())
                .eq(query.getAssociationId() != null, PaleoCmsChannel::getAssociationId, query.getAssociationId())
                .eq(StringUtils.hasText(query.getChannelCode()), PaleoCmsChannel::getChannelCode, query.getChannelCode())
                .eq(StringUtils.hasText(query.getRoutePath()), PaleoCmsChannel::getRoutePath, query.getRoutePath())
                .eq(StringUtils.hasText(query.getPageType()), PaleoCmsChannel::getPageType, query.getPageType())
                .eq(StringUtils.hasText(query.getStatus()), PaleoCmsChannel::getStatus, query.getStatus());
    }

    private void normalizeChannel(PaleoCmsChannel channel, boolean isNew) {
        channel.setDeleted("0");
        if (channel.getVisible() == null) {
            channel.setVisible("1");
        }
        if (channel.getStatus() == null) {
            channel.setStatus("PUBLISHED");
        }
        if (channel.getLocked() == null) {
            channel.setLocked("0");
        }
        if (channel.getParentId() == null) {
            channel.setParentId(0L);
        }
        if (channel.getSortOrder() == null) {
            channel.setSortOrder(0);
        }
        if (channel.getPageType() == null) {
            channel.setPageType("CMS");
        }
    }
}
