package com.chuanghai.paleo.cms.domain;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

@Data
@TableName("paleo_user_binding")
public class PaleoUserBinding {
    @TableId(type = IdType.AUTO)
    private Long bindingId;
    private Long userId;
    private Long associationId;
    private String bindingStatus;
}
