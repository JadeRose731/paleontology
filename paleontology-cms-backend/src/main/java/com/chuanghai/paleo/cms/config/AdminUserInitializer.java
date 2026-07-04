package com.chuanghai.paleo.cms.config;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.chuanghai.paleo.cms.domain.CmsAdminUser;
import com.chuanghai.paleo.cms.mapper.CmsAdminUserMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class AdminUserInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminUserInitializer.class);

    @Autowired
    private CmsAdminUserMapper adminUserMapper;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        CmsAdminUser admin = adminUserMapper.selectOne(new LambdaQueryWrapper<CmsAdminUser>()
                .eq(CmsAdminUser::getUsername, "admin"));
        if (admin == null) {
            admin = new CmsAdminUser();
            admin.setUsername("admin");
            admin.setDisplayName("系统管理员");
            admin.setRole("admin");
            admin.setStatus("1");
            admin.setPasswordHash(passwordEncoder.encode("admin123"));
            adminUserMapper.insert(admin);
            log.info("Created default admin user: admin / admin123");
            return;
        }
        if (!passwordEncoder.matches("admin123", admin.getPasswordHash())) {
            admin.setPasswordHash(passwordEncoder.encode("admin123"));
            adminUserMapper.updateById(admin);
            log.info("Reset admin password to admin123");
        }
    }
}
