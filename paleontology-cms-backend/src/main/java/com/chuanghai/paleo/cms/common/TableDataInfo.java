package com.chuanghai.paleo.cms.common;

import java.io.Serializable;
import java.util.List;

public class TableDataInfo implements Serializable {

    private static final long serialVersionUID = 1L;

    private long total;
    private List<?> rows;
    private int code = 200;
    private String msg = "查询成功";

    public TableDataInfo() {
    }

    public TableDataInfo(List<?> rows, long total) {
        this.rows = rows;
        this.total = total;
    }

    public long getTotal() {
        return total;
    }

    public void setTotal(long total) {
        this.total = total;
    }

    public List<?> getRows() {
        return rows;
    }

    public void setRows(List<?> rows) {
        this.rows = rows;
    }

    public int getCode() {
        return code;
    }

    public void setCode(int code) {
        this.code = code;
    }

    public String getMsg() {
        return msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}
