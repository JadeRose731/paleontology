package com.chuanghai.paleo.cms.domain;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.util.Date;

@Data
@TableName("paleo_cms_entry")
public class PaleoCmsEntry {

    @TableId(type = IdType.AUTO)
    private Long entryId;
    private Long associationId;
    private String moduleCode;
    private String columnCode;
    private String scope;
    private String title;
    private String category;
    private String summary;
    private String bodyContent;
    private String coverUrl;
    private String mediaUrl;
    private String fileUrl;
    private String linkUrl;
    private String extraJson;
    private String fileExtension;
    private Long fileSize;
    private Integer refCount;
    private String memberOnly;
    private String pinned;
    private Integer sortOrder;
    private Date publishTime;
    private String status;
    private String deleted;
    private String createBy;
    private Date createTime;
    private String updateBy;
    private Date updateTime;
    private String remark;
}
