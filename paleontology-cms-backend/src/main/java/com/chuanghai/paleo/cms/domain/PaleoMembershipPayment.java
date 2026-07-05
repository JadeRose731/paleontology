package com.chuanghai.paleo.cms.domain;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.math.BigDecimal;
import java.util.Date;

@Data
@TableName("paleo_membership_payment")
public class PaleoMembershipPayment {
    @TableId(type = IdType.AUTO)
    private Long paymentId;
    private Long userId;
    private Long applicationId;
    private String memberCategory;
    private BigDecimal amount;
    private String paymentStatus;
    private String voucherUrl;
    private String invoiceUrl;
    private String reviewComment;
    @JsonFormat(pattern = "yyyy-MM-dd")
    private Date validStartDate;
    @JsonFormat(pattern = "yyyy-MM-dd")
    private Date validEndDate;
    private String createBy;
    private Date createTime;
    private String updateBy;
    private Date updateTime;
}
