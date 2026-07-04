package com.chuanghai.paleo.cms.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * 上传目录解析为绝对路径，避免 Tomcat 临时工作目录导致 ./uploads 不可写。
 */
@Component
@ConfigurationProperties(prefix = "cms.upload")
public class CmsUploadProperties {

    /** 配置项：可为相对或绝对路径 */
    private String baseDir = "./uploads";

    private String baseUrl = "/uploads";

    /** 运行时解析后的绝对目录 */
    private Path resolvedBaseDir;

    @PostConstruct
    public void init() throws IOException {
        Path path = Paths.get(baseDir);
        if (!path.isAbsolute()) {
            path = Paths.get(System.getProperty("user.dir")).resolve(path).normalize();
        }
        Files.createDirectories(path);
        this.resolvedBaseDir = path.toAbsolutePath().normalize();
    }

    public String getBaseDir() {
        return baseDir;
    }

    public void setBaseDir(String baseDir) {
        this.baseDir = baseDir;
    }

    public String getBaseUrl() {
        return baseUrl;
    }

    public void setBaseUrl(String baseUrl) {
        this.baseUrl = baseUrl;
    }

    public Path getResolvedBaseDir() {
        return resolvedBaseDir;
    }

    /** Spring ResourceHandler 用的 file: 前缀路径 */
    public String fileLocationPrefix() {
        String loc = resolvedBaseDir.toUri().toString();
        return loc.endsWith("/") ? loc : loc + "/";
    }
}
