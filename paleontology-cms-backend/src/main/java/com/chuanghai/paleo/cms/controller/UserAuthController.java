package com.chuanghai.paleo.cms.controller;

import com.chuanghai.paleo.cms.common.AjaxResult;
import com.chuanghai.paleo.cms.common.BaseController;
import com.chuanghai.paleo.cms.domain.PaleoMemberProfile;
import com.chuanghai.paleo.cms.domain.PaleoUser;
import com.chuanghai.paleo.cms.security.Anonymous;
import com.chuanghai.paleo.cms.security.JwtTokenUtil;
import com.chuanghai.paleo.cms.security.LoginUser;
import com.chuanghai.paleo.cms.service.PaleoMemberProfileService;
import com.chuanghai.paleo.cms.service.PaleoUserService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@Api(tags = "网站用户认证")
@RestController
@RequestMapping("/paleo/auth")
public class UserAuthController extends BaseController {

    @Autowired
    private PaleoUserService userService;

    @Autowired
    private PaleoMemberProfileService memberProfileService;

    @Autowired
    private JwtTokenUtil jwtTokenUtil;

    @Anonymous
    @ApiOperation("用户注册")
    @PostMapping("/register")
    public AjaxResult register(@RequestBody Map<String, Object> body) {
        try {
            PaleoUser user = mapUser(body);
            String password = (String) body.get("password");
            PaleoUser created = userService.register(user, password);
            return success(buildAuthResponse(created));
        } catch (IllegalArgumentException e) {
            return error(e.getMessage());
        }
    }

    @Anonymous
    @ApiOperation("用户登录")
    @PostMapping("/login")
    public AjaxResult login(@RequestBody Map<String, String> body) {
        try {
            String email = body.get("email");
            if (!StringUtils.hasText(email)) {
                email = body.get("username");
            }
            PaleoUser user = userService.login(email, body.get("password"));
            return success(buildAuthResponse(user));
        } catch (IllegalArgumentException e) {
            return error(e.getMessage());
        }
    }

    @ApiOperation("当前用户信息")
    @GetMapping("/info")
    public AjaxResult info() {
        Long userId = getUserId();
        if (userId == null) {
            return error("未登录");
        }
        PaleoUser user = userService.getById(userId);
        if (user == null) {
            return error("用户不存在");
        }
        PaleoMemberProfile profile = memberProfileService.getOrCreate(userId, user.getEmail());
        if ("ACTIVE".equals(profile.getMemberStatus()) && !"member".equals(user.getUserType())) {
            user = userService.updateUserType(userId, "member", true, user.getEmail());
        }
        Map<String, Object> data = new HashMap<>();
        data.put("user", userService.sanitize(user));
        data.put("profile", profile);
        return success(data);
    }

    @ApiOperation("更新个人资料")
    @PutMapping("/profile")
    public AjaxResult updateProfile(@RequestBody PaleoUser patch) {
        Long userId = getUserId();
        if (userId == null) {
            return error("未登录");
        }
        try {
            return success(userService.updateProfile(userId, patch, getUsername()));
        } catch (IllegalArgumentException e) {
            return error(e.getMessage());
        }
    }

    @ApiOperation("更新会员路径选择")
    @PutMapping("/user-type")
    public AjaxResult updateUserType(@RequestBody Map<String, Object> body) {
        Long userId = getUserId();
        if (userId == null) {
            return error("未登录");
        }
        String userType = body.get("userType") != null ? String.valueOf(body.get("userType")) : null;
        Boolean choiceMade = body.get("membershipChoiceMade") != null
                ? Boolean.valueOf(String.valueOf(body.get("membershipChoiceMade")))
                : null;
        try {
            return success(userService.updateUserType(userId, userType, choiceMade, getUsername()));
        } catch (IllegalArgumentException e) {
            return error(e.getMessage());
        }
    }

    private PaleoUser mapUser(Map<String, Object> body) {
        PaleoUser user = new PaleoUser();
        user.setEmail(stringVal(body.get("email")));
        user.setUserName(stringVal(body.get("name"), body.get("userName")));
        user.setGender(stringVal(body.get("gender")));
        user.setUnit(stringVal(body.get("unit")));
        user.setRoleLabel(stringVal(body.get("role"), body.get("roleLabel")));
        user.setTitle(stringVal(body.get("title")));
        Object isStudent = body.get("isStudent");
        if (isStudent != null) {
            user.setIsStudent(Boolean.TRUE.equals(isStudent) || "1".equals(String.valueOf(isStudent)) ? "1" : "0");
        }
        return user;
    }

    private String stringVal(Object... values) {
        for (Object v : values) {
            if (v != null && StringUtils.hasText(String.valueOf(v))) {
                return String.valueOf(v);
            }
        }
        return null;
    }

    private Map<String, Object> buildAuthResponse(PaleoUser user) {
        LoginUser loginUser = new LoginUser(
                user.getUserId(),
                user.getEmail(),
                user.getUserName() != null ? user.getUserName() : user.getEmail(),
                "user",
                null
        );
        String token = jwtTokenUtil.createToken(loginUser);
        Map<String, Object> data = new HashMap<>();
        data.put("token", token);
        data.put("user", user);
        data.put("profile", memberProfileService.getOrCreate(user.getUserId(), user.getEmail()));
        return data;
    }
}
