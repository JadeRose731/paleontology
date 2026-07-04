package com.chuanghai.paleo.cms.security;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Collections;
import java.util.concurrent.TimeUnit;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    @Autowired
    private JwtTokenUtil jwtTokenUtil;

    @Autowired(required = false)
    private StringRedisTemplate redisTemplate;

    @Value("${cms.jwt.header:Authorization}")
    private String header;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String token = resolveToken(request);
        if (StringUtils.hasText(token)) {
            try {
                if (redisTemplate != null && Boolean.TRUE.equals(redisTemplate.hasKey(tokenKey(token)))) {
                    chain.doFilter(request, response);
                    return;
                }
                LoginUser user = jwtTokenUtil.toLoginUser(jwtTokenUtil.parseToken(token));
                UsernamePasswordAuthenticationToken auth =
                        new UsernamePasswordAuthenticationToken(user, null, Collections.emptyList());
                SecurityContextHolder.getContext().setAuthentication(auth);
            } catch (Exception ignored) {
                SecurityContextHolder.clearContext();
            }
        }
        chain.doFilter(request, response);
    }

    private String resolveToken(HttpServletRequest request) {
        String bearer = request.getHeader(header);
        if (StringUtils.hasText(bearer) && bearer.startsWith("Bearer ")) {
            return bearer.substring(7);
        }
        return bearer;
    }

    public void blacklistToken(String token, long minutes) {
        if (redisTemplate != null && StringUtils.hasText(token)) {
            redisTemplate.opsForValue().set(tokenKey(token), "1", minutes, TimeUnit.MINUTES);
        }
    }

    private String tokenKey(String token) {
        return "cms:jwt:blacklist:" + token;
    }
}
