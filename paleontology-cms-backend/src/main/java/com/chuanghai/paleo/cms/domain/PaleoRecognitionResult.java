package com.chuanghai.paleo.cms.domain;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.util.Date;

@Data
@TableName("paleo_recognition_result")
public class PaleoRecognitionResult {

    @TableId(type = IdType.AUTO)
    private Long resultId;
    private String targetType;
    private Long targetId;
    private Long userId;
    private Long associationId;
    private String fileRole;
    private String fileUrl;
    private String autoStatus;
    private String autoDetail;
    private String manualStatus;
    private String manualComment;
    private Long reviewedBy;
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private Date reviewedAt;
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private Date createTime;
}
