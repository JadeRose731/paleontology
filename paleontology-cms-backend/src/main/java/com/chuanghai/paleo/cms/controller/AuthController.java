package com.chuanghai.paleo.cms.controller;

import com.chuanghai.paleo.cms.common.AjaxResult;
import com.chuanghai.paleo.cms.domain.CmsAdminUser;
import com.chuanghai.paleo.cms.security.Anonymous;
import com.chuanghai.paleo.cms.security.JwtTokenUtil;
import com.chuanghai.paleo.cms.security.LoginUser;
import com.chuanghai.paleo.cms.service.CmsAdminUserService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@Api(tags = "认证")
@RestController
public class AuthController {

    @Autowired
    private CmsAdminUserService adminUserService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtTokenUtil jwtTokenUtil;

    @Anonymous
    @ApiOperation("管理员登录（支持 username 或 email）")
    @PostMapping("/login")
    public AjaxResult login(@RequestBody Map<String, String> body) {
        String loginId = firstNonBlank(body.get("username"), body.get("email"));
        String password = body.get("password");
        if (!StringUtils.hasText(loginId) || !StringUtils.hasText(password)) {
            return AjaxResult.error("用户名和密码不能为空");
        }
        CmsAdminUser user = adminUserService.findByLoginId(loginId);
        if (user == null || !passwordEncoder.matches(password, user.getPasswordHash())) {
            return AjaxResult.error("用户名或密码错误");
        }
        String branchCode = user.getBranchId();
        LoginUser loginUser = new LoginUser(
                user.getUserId(),
                user.getUsername(),
                user.getDisplayName(),
                user.getRole(),
                branchCode);
        String token = jwtTokenUtil.createToken(loginUser);
        Map<String, Object> data = new HashMap<>();
        data.put("token", token);
        data.put("username", user.getUsername());
        data.put("email", user.getEmail() != null ? user.getEmail() : user.getUsername());
        data.put("displayName", user.getDisplayName());
        data.put("role", user.getRole());
        data.put("branchCode", branchCode);
        data.put("branchId", branchCode);
        return AjaxResult.success(data);
    }

    @ApiOperation("当前用户信息")
    @GetMapping("/getInfo")
    public AjaxResult getInfo() {
        org.springframework.security.core.Authentication auth =
                org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof LoginUser)) {
            return AjaxResult.error(401, "未登录");
        }
        LoginUser user = (LoginUser) auth.getPrincipal();
        Map<String, Object> data = new HashMap<>();
        data.put("username", user.getUsername());
        data.put("displayName", user.getDisplayName());
        data.put("role", user.getRole());
        data.put("branchId", user.getBranchId());
        data.put("branchCode", user.getBranchId());
        return AjaxResult.success(data);
    }

    private String firstNonBlank(String... values) {
        if (values == null) {
            return null;
        }
        for (String v : values) {
            if (StringUtils.hasText(v)) {
                return v.trim();
            }
        }
        return null;
    }
}
