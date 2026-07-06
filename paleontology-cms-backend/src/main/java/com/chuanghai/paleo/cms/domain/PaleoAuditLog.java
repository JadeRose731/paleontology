package com.chuanghai.paleo.cms.domain;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.util.Date;

@Data
@TableName("paleo_audit_log")
public class PaleoAuditLog {

    @TableId(type = IdType.AUTO)
    private Long logId;
    private Long operatorId;
    private String operatorEmail;
    private String operatorRole;
    private String action;
    private String targetType;
    private String targetId;
    private Long associationId;
    private String summary;
    private String detailJson;
    private String ip;
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private Date createTime;
}
