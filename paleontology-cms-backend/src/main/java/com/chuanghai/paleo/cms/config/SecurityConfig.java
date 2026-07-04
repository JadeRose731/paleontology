package com.chuanghai.paleo.cms.config;

import com.chuanghai.paleo.cms.security.Anonymous;
import com.chuanghai.paleo.cms.security.JwtAuthenticationFilter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityConfigurerAdapter;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.mvc.method.RequestMappingInfo;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

import javax.annotation.PostConstruct;
import java.util.HashSet;
import java.util.Set;

@Configuration
@EnableWebSecurity
public class SecurityConfig extends WebSecurityConfigurerAdapter {

    @Autowired
    private JwtAuthenticationFilter jwtFilter;

    @Autowired
    private RequestMappingHandlerMapping handlerMapping;

    private final Set<String> anonymousPaths = new HashSet<>();

    @PostConstruct
    public void collectAnonymousPaths() {
        anonymousPaths.add("/login");
        anonymousPaths.add("/doc.html");
        anonymousPaths.add("/webjars/**");
        anonymousPaths.add("/swagger-resources/**");
        anonymousPaths.add("/v2/api-docs");
        anonymousPaths.add("/v3/api-docs/**");
        anonymousPaths.add("/uploads/**");
        anonymousPaths.add("/paleo/cms/public/**");
        anonymousPaths.add("/paleo/cms-channels/public/**");

        handlerMapping.getHandlerMethods().forEach((RequestMappingInfo info, HandlerMethod method) -> {
            if (method.hasMethodAnnotation(Anonymous.class) || method.getBeanType().isAnnotationPresent(Anonymous.class)) {
                info.getPatternsCondition().getPatterns().forEach(anonymousPaths::add);
            }
        });
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Override
    protected void configure(HttpSecurity http) throws Exception {
        http.csrf().disable()
                .sessionManagement().sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                .and()
                .authorizeRequests()
                .antMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .antMatchers(anonymousPaths.toArray(new String[0])).permitAll()
                .anyRequest().authenticated()
                .and()
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);
    }
}
