package com.chuanghai.paleo.cms.domain;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.util.Date;

@Data
@TableName("paleo_conference")
public class PaleoConference {
    @TableId(type = IdType.AUTO)
    private Long conferenceId;
    private Long associationId;
    /** 与前端 confId 对齐，如 conf-zgswxh-1 */
    private String conferenceCode;
    private String conferenceTitle;
    private String city;
    private Date startDate;
    private Date endDate;
    private String status;
}
