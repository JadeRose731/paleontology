package com.chuanghai.paleo.cms.config;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.chuanghai.paleo.cms.domain.CmsAdminUser;
import com.chuanghai.paleo.cms.domain.PaleoAdminAssociation;
import com.chuanghai.paleo.cms.domain.PaleoAssociation;
import com.chuanghai.paleo.cms.mapper.CmsAdminUserMapper;
import com.chuanghai.paleo.cms.mapper.PaleoAdminAssociationMapper;
import com.chuanghai.paleo.cms.mapper.PaleoAssociationMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 按 PRD §六 初始化 13 个演示管理员（1 总管理员 + 11 分会 + 1 财务），密码统一 admin123。
 */
@Component
public class AdminUserInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminUserInitializer.class);
    private static final String DEMO_PASSWORD = "admin123";

    private static final List<SeedAdmin> SEED_ADMINS = Arrays.asList(
            new SeedAdmin("admin@paleontology.org.cn", "学会总管理员", "super_admin", null),
            new SeedAdmin("branch_gwjzdwxfh@paleo.org.cn", "古无脊椎动物学分会管理员", "branch_admin", "gwjzdwxfh"),
            new SeedAdmin("branch_kpgzwyh@paleo.org.cn", "科普工作委员会管理员", "branch_admin", "kpgzwyh"),
            new SeedAdmin("branch_bfxfh@paleo.org.cn", "孢粉学分会管理员", "branch_admin", "bfxfh"),
            new SeedAdmin("branch_wtxfh@paleo.org.cn", "微体学分会管理员", "branch_admin", "wtxfh"),
            new SeedAdmin("branch_hszlzwyh@paleo.org.cn", "化石藻类专业委员会管理员", "branch_admin", "hszlzwyh"),
            new SeedAdmin("branch_gzwxfh@paleo.org.cn", "古植物学分会管理员", "branch_admin", "gzwxfh"),
            new SeedAdmin("branch_dqswx@paleo.org.cn", "地球生物学分会管理员", "branch_admin", "dqswx"),
            new SeedAdmin("branch_gst@paleo.org.cn", "古生态专业分会管理员", "branch_admin", "gst"),
            new SeedAdmin("branch_gjzdw@paleo.org.cn", "古脊椎动物学分会管理员", "branch_admin", "gjzdw"),
            new SeedAdmin("branch_swcj@paleo.org.cn", "生物沉积学分会管理员", "branch_admin", "swcj"),
            new SeedAdmin("branch_xjsxff@paleo.org.cn", "新技术新方法专业委员会管理员", "branch_admin", "xjsxff"),
            new SeedAdmin("finance@paleontology.org.cn", "财务审核员", "finance_reviewer", null)
    );

    @Autowired
    private CmsAdminUserMapper adminUserMapper;

    @Autowired
    private PaleoAdminAssociationMapper adminAssociationMapper;

    @Autowired
    private PaleoAssociationMapper associationMapper;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        Map<String, Long> branchCodeToAssocId = associationMapper.selectList(new LambdaQueryWrapper<PaleoAssociation>()
                        .isNotNull(PaleoAssociation::getBranchCode))
                .stream()
                .filter(a -> StringUtils.hasText(a.getBranchCode()))
                .collect(Collectors.toMap(PaleoAssociation::getBranchCode, PaleoAssociation::getAssociationId, (a, b) -> a));

        for (SeedAdmin seed : SEED_ADMINS) {
            upsertAdmin(seed, branchCodeToAssocId);
        }
        log.info("Demo admin accounts initialized ({} accounts, password: {})", SEED_ADMINS.size(), DEMO_PASSWORD);
    }

    private void upsertAdmin(SeedAdmin seed, Map<String, Long> branchCodeToAssocId) {
        CmsAdminUser existing = adminUserMapper.selectOne(new LambdaQueryWrapper<CmsAdminUser>()
                .eq(CmsAdminUser::getEmail, seed.email)
                .last("LIMIT 1"));
        if (existing == null) {
            existing = adminUserMapper.selectOne(new LambdaQueryWrapper<CmsAdminUser>()
                    .eq(CmsAdminUser::getUsername, seed.email)
                    .last("LIMIT 1"));
        }

        CmsAdminUser user = existing != null ? existing : new CmsAdminUser();
        user.setUsername(seed.email);
        user.setEmail(seed.email);
        user.setDisplayName(seed.displayName);
        user.setRole(seed.role);
        user.setBranchId(seed.branchCode);
        user.setStatus("1");
        if (!StringUtils.hasText(user.getPasswordHash()) || !passwordEncoder.matches(DEMO_PASSWORD, user.getPasswordHash())) {
            user.setPasswordHash(passwordEncoder.encode(DEMO_PASSWORD));
        }

        if (existing == null) {
            adminUserMapper.insert(user);
            log.info("Created demo admin: {} ({})", seed.email, seed.role);
        } else {
            adminUserMapper.updateById(user);
        }

        if ("branch_admin".equals(seed.role) && StringUtils.hasText(seed.branchCode)) {
            Long associationId = branchCodeToAssocId.get(seed.branchCode);
            if (associationId == null) {
                log.warn("No association found for branch_code={}, admin={}", seed.branchCode, seed.email);
                return;
            }
            PaleoAdminAssociation binding = adminAssociationMapper.selectOne(new LambdaQueryWrapper<PaleoAdminAssociation>()
                    .eq(PaleoAdminAssociation::getAdminUserId, user.getUserId())
                    .eq(PaleoAdminAssociation::getAssociationId, associationId)
                    .last("LIMIT 1"));
            if (binding == null) {
                binding = new PaleoAdminAssociation();
                binding.setAdminUserId(user.getUserId());
                binding.setAssociationId(associationId);
                binding.setBindingStatus("BOUND");
                adminAssociationMapper.insert(binding);
                log.info("Bound admin {} to association_id={} ({})", seed.email, associationId, seed.branchCode);
            } else if (!"BOUND".equals(binding.getBindingStatus())) {
                binding.setBindingStatus("BOUND");
                adminAssociationMapper.updateById(binding);
            }
        }
    }

    private static final class SeedAdmin {
        final String email;
        final String displayName;
        final String role;
        final String branchCode;

        SeedAdmin(String email, String displayName, String role, String branchCode) {
            this.email = email;
            this.displayName = displayName;
            this.role = role;
            this.branchCode = branchCode;
        }
    }
}
