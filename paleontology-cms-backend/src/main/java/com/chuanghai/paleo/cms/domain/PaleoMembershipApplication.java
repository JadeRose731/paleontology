package com.chuanghai.paleo.cms.domain;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.util.Date;

@Data
@TableName("paleo_membership_application")
public class PaleoMembershipApplication {
    @TableId(type = IdType.AUTO)
    private Long applicationId;
    private Long userId;
    /** JOIN / WITHDRAW */
    private String applicationType;
    private String memberCategory;
    private String applicantName;
    private String applicantPhone;
    private String applicantEmail;
    private String applicationFileUrl;
    private String reviewStatus;
    private String reviewComment;
    private String reviewer;
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private Date reviewTime;
    private String createBy;
    private Date createTime;
    private String updateBy;
    private Date updateTime;
}
