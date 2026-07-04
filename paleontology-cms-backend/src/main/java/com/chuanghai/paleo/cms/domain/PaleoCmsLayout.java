package com.chuanghai.paleo.cms.domain;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

@Data
@TableName("paleo_cms_layout")
public class PaleoCmsLayout {

    @TableId
    private String layoutCode;
    private String layoutName;
    private String description;
    private String schemaJson;
    private Integer sortOrder;
    private String status;
}
