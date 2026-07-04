package com.chuanghai.paleo.cms.domain;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

@Data
@TableName("paleo_association")
public class PaleoAssociation {
    @TableId(type = IdType.AUTO)
    private Long associationId;
    private String associationName;
    private String associationType;
    private Integer sortOrder;
    private String status;
}
