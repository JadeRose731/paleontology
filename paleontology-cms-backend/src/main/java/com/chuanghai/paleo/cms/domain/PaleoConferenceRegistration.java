package com.chuanghai.paleo.cms.domain;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.math.BigDecimal;
import java.util.Date;

@Data
@TableName("paleo_conference_registration")
public class PaleoConferenceRegistration {
    @TableId(type = IdType.AUTO)
    private Long registrationId;
    private Long conferenceId;
    private Long associationId;
    private Long userId;
    private String feeType;
    private BigDecimal feeAmount;
    private String paymentStatus;
    private String voucherUrl;
    private String invoiceUrl;
    private String reviewComment;
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private Date voucherSubmitTime;
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private Date voucherAuditTime;
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private Date invoiceSubmitTime;
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private Date invoiceAuditTime;
    @JsonFormat(pattern = "yyyy-MM-dd", timezone = "GMT+8")
    private Date invoiceDeadline;
    private String createBy;
    private Date createTime;
    private String updateBy;
    private Date updateTime;

    /** 非持久化：前端会议 ID */
    private transient String conferenceCode;
    /** 非持久化：会议标题 */
    private transient String conferenceTitle;
    /** 非持久化：用户邮箱 */
    private transient String userEmail;
    /** 非持久化：用户姓名 */
    private transient String userName;
}
