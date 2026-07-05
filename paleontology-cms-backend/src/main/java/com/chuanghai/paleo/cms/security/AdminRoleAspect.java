package com.chuanghai.paleo.cms.security;

import com.chuanghai.paleo.cms.service.AdminScopeService;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.annotation.AnnotationUtils;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;

@Aspect
@Component
public class AdminRoleAspect {

    @Autowired
    private AdminScopeService adminScopeService;

    @Before("@within(com.chuanghai.paleo.cms.security.RequireAdminRole) || @annotation(com.chuanghai.paleo.cms.security.RequireAdminRole)")
    public void checkRole(JoinPoint joinPoint) {
        RequireAdminRole ann = resolveAnnotation(joinPoint);
        if (ann == null) {
            return;
        }
        LoginUser user = currentUser();
        adminScopeService.assertRole(user, ann.value());
    }

    private RequireAdminRole resolveAnnotation(JoinPoint joinPoint) {
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        Method method = signature.getMethod();
        RequireAdminRole ann = AnnotationUtils.findAnnotation(method, RequireAdminRole.class);
        if (ann != null) {
            return ann;
        }
        return AnnotationUtils.findAnnotation(joinPoint.getTarget().getClass(), RequireAdminRole.class);
    }

    private LoginUser currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof LoginUser) {
            return (LoginUser) auth.getPrincipal();
        }
        return null;
    }
}
