package com.chuanghai.paleo.cms.domain;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.util.Date;

@Data
@TableName("cms_admin_user")
public class CmsAdminUser {

    @TableId(type = IdType.AUTO)
    private Long userId;
    private String username;
    /** 登录邮箱，与前端管理端一致 */
    private String email;
    private String passwordHash;
    private String displayName;
    private String role;
    private String branchId;
    private String status;
    private Date createTime;
}
