package com.chuanghai.paleo.cms.config;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.chuanghai.paleo.cms.domain.PaleoUser;
import com.chuanghai.paleo.cms.mapper.PaleoUserMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DemoUserInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoUserInitializer.class);

    private static final String[][] DEMO_USERS = {
            {"demo@paleontology.org.cn", "demo123", "演示用户", "男", "中国古生物学会", "教师", "高级工程师", "0"},
            {"member@paleontology.org.cn", "password123", "张华", "男", "中国科学院古脊椎动物与古人类研究所", "教师", "研究员", "0"},
            {"student@paleontology.org.cn", "password123", "李萌", "女", "南京大学地科院", "学生", "硕士研究生", "1"},
    };

    @Autowired
    private PaleoUserMapper userMapper;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        for (String[] row : DEMO_USERS) {
            ensureDemoUser(row[0], row[1], row[2], row[3], row[4], row[5], row[6], row[7]);
        }
    }

    private void ensureDemoUser(String email, String password, String name, String gender,
                                String unit, String roleLabel, String title, String isStudent) {
        PaleoUser existing = userMapper.selectOne(new LambdaQueryWrapper<PaleoUser>()
                .eq(PaleoUser::getEmail, email)
                .last("LIMIT 1"));
        if (existing == null) {
            PaleoUser user = new PaleoUser();
            user.setEmail(email);
            user.setPasswordHash(passwordEncoder.encode(password));
            user.setUserName(name);
            user.setGender(gender);
            user.setUnit(unit);
            user.setRoleLabel(roleLabel);
            user.setTitle(title);
            user.setIsStudent(isStudent);
            user.setUserType("regular");
            user.setMembershipChoiceMade("0");
            user.setStatus("1");
            user.setCreateBy("system");
            userMapper.insert(user);
            log.info("Created demo user: {} / {}", email, password);
            return;
        }
        if (!passwordEncoder.matches(password, existing.getPasswordHash())) {
            existing.setPasswordHash(passwordEncoder.encode(password));
            userMapper.updateById(existing);
            log.info("Reset demo user password: {} / {}", email, password);
        }
    }
}
