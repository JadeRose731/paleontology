package com.chuanghai.paleo.cms.domain;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Data;

import java.util.Date;

@Data
@TableName("paleo_user")
public class PaleoUser {
    @TableId(type = IdType.AUTO)
    private Long userId;
    private String email;
    @JsonIgnore
    private String passwordHash;
    private String userName;
    private String gender;
    private String unit;
    private String roleLabel;
    private String title;
    private String isStudent;
    private String userType;
    private String membershipChoiceMade;
    private String status;
    private String createBy;
    private Date createTime;
    private String updateBy;
    private Date updateTime;
}
