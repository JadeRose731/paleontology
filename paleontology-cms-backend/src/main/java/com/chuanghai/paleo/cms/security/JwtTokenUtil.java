package com.chuanghai.paleo.cms.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Component
public class JwtTokenUtil {

    @Value("${cms.jwt.secret}")
    private String secret;

    @Value("${cms.jwt.expire-minutes:480}")
    private int expireMinutes;

    public String createToken(LoginUser user) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", user.getUserId());
        claims.put("username", user.getUsername());
        claims.put("role", user.getRole());
        claims.put("branchId", user.getBranchId());
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .setClaims(claims)
                .setSubject(user.getUsername())
                .setIssuedAt(new Date(now))
                .setExpiration(new Date(now + expireMinutes * 60L * 1000L))
                .signWith(SignatureAlgorithm.HS512, secret)
                .compact();
    }

    public Claims parseToken(String token) {
        return Jwts.parser()
                .setSigningKey(secret)
                .parseClaimsJws(token)
                .getBody();
    }

    public LoginUser toLoginUser(Claims claims) {
        return new LoginUser(
                claims.get("userId", Long.class),
                claims.getSubject(),
                claims.get("username", String.class),
                claims.get("role", String.class),
                claims.get("branchId", String.class)
        );
    }
}
