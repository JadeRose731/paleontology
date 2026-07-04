package com.chuanghai.paleo.cms.domain;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.util.Date;

@Data
@TableName("paleo_cms_block")
public class PaleoCmsBlock {

    @TableId(type = IdType.AUTO)
    private Long blockId;
    private Long channelId;
    private String blockType;
    private String title;
    private String bodyContent;
    private String dataSource;
    private Integer sortOrder;
    private String visible;
    private String status;
    private String deleted;
    private String createBy;
    private Date createTime;
    private String updateBy;
    private Date updateTime;
    private String remark;
}
