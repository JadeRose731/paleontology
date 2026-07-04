package com.chuanghai.paleo.cms.domain;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.util.Date;

@Data
@TableName("paleo_membership_payment")
public class PaleoMembershipPayment {
    @TableId(type = IdType.AUTO)
    private Long paymentId;
    private Long userId;
    private String memberCategory;
    private BigDecimal amount;
    private String paymentStatus;
    private String voucherUrl;
    private String invoiceUrl;
    private String reviewComment;
    private Date createTime;
}
