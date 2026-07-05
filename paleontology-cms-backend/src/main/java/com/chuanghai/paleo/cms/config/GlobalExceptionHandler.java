package com.chuanghai.paleo.cms.config;

import com.chuanghai.paleo.cms.common.AjaxResult;
import com.chuanghai.paleo.cms.security.AdminAccessDeniedException;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(AdminAccessDeniedException.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public AjaxResult handleAccessDenied(AdminAccessDeniedException ex) {
        return AjaxResult.error(403, ex.getMessage());
    }
}
