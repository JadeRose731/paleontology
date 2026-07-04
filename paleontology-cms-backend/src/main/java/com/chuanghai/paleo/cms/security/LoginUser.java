package com.chuanghai.paleo.cms.security;

import lombok.Data;

@Data
public class LoginUser {

    private Long userId;
    private String username;
    private String displayName;
    private String role;
    private String branchId;

    public LoginUser(Long userId, String username, String displayName, String role, String branchId) {
        this.userId = userId;
        this.username = username;
        this.displayName = displayName;
        this.role = role;
        this.branchId = branchId;
    }
}
