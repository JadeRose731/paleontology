package com.chuanghai.paleo.cms.domain;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.util.Date;

@Data
@TableName("paleo_membership_template")
public class PaleoMembershipTemplate {

    @TableId(type = IdType.AUTO)
    private Long templateId;

    /** JOIN | WITHDRAW */
    private String templateType;

    private String fileName;

    private String fileUrl;

    private String updateBy;

    private Date updateTime;
}
