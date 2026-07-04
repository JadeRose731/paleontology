package com.chuanghai.paleo.cms.domain;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.util.Date;

@Data
@TableName("paleo_member_profile")
public class PaleoMemberProfile {
    @TableId(type = IdType.AUTO)
    private Long profileId;
    private Long userId;
    private String userName;
    private String memberStatus;
    private String memberCategory;
    private Date validStartDate;
    private Date validEndDate;
}
