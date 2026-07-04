package com.chuanghai.paleo.cms.domain;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;

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
}
