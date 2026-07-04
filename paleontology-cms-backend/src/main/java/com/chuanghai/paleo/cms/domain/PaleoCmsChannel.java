package com.chuanghai.paleo.cms.domain;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.util.Date;

@Data
@TableName("paleo_cms_channel")
public class PaleoCmsChannel {

    @TableId(type = IdType.AUTO)
    private Long channelId;
    private Long associationId;
    private String channelCode;
    private Long parentId;
    private String routePath;
    private String navName;
    private Integer sortOrder;
    private String visible;
    private String showInAdmin;
    private String adminSection;
    private String navIcon;
    private String adminRoles;
    private String title;
    private String subtitle;
    private String kicker;
    private String breadcrumbName;
    private String layoutType;
    private String layoutParams;
    private String contentModule;
    private String contentFilter;
    private String pageType;
    private String shellType;
    private String status;
    private String locked;
    private String deleted;
    private String createBy;
    private Date createTime;
    private String updateBy;
    private Date updateTime;
    private String remark;
}
