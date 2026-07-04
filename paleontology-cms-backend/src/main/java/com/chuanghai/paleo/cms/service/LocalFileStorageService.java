package com.chuanghai.paleo.cms.service;

import com.chuanghai.paleo.cms.config.CmsUploadProperties;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Service
public class LocalFileStorageService {

    private static final Set<String> ALLOWED = new HashSet<>(Arrays.asList(
            "doc", "docx", "pdf", "xls", "xlsx", "ppt", "pptx", "zip", "rar",
            "mp3", "wav", "m4a", "mp4", "avi", "mov", "wmv", "mkv", "flv",
            "jpg", "jpeg", "png", "gif", "tiff", "webp"
    ));

    private static final long MAX_SIZE = 20L * 1024 * 1024;

    @Autowired
    private CmsUploadProperties uploadProperties;

    public StoredFile store(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("文件不能为空");
        }
        if (file.getSize() > MAX_SIZE) {
            throw new IllegalArgumentException("文件大小不能超过 20MB");
        }
        String original = file.getOriginalFilename();
        String ext = getExtension(original);
        if (!ALLOWED.contains(ext)) {
            throw new IllegalArgumentException("不支持的文件格式: " + ext);
        }

        String dateDir = LocalDate.now().toString().replace("-", "");
        Path dir = uploadProperties.getResolvedBaseDir().resolve(dateDir);
        Files.createDirectories(dir);

        String storedName = UUID.randomUUID().toString().replace("-", "") + "." + ext;
        Path target = dir.resolve(storedName);

        // Windows 下 transferTo 相对路径易失败，改用流复制
        try (InputStream in = file.getInputStream()) {
            Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
        }

        String baseUrl = uploadProperties.getBaseUrl();
        if (!baseUrl.startsWith("/")) {
            baseUrl = "/" + baseUrl;
        }
        String url = baseUrl + "/" + dateDir + "/" + storedName;
        return new StoredFile(url, ext, file.getSize(), original);
    }

    public String getExtension(String fileName) {
        if (!StringUtils.hasText(fileName) || !fileName.contains(".")) {
            return "";
        }
        return fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase();
    }

    public String resolveMediaColumn(String extension) {
        if (extension == null) {
            return "document";
        }
        switch (extension.toLowerCase()) {
            case "mp4":
            case "avi":
            case "mov":
            case "wmv":
            case "mkv":
            case "flv":
                return "video";
            case "jpg":
            case "jpeg":
            case "png":
            case "gif":
            case "tiff":
            case "webp":
                return "image";
            default:
                return "document";
        }
    }

    public static class StoredFile {
        public final String url;
        public final String extension;
        public final long size;
        public final String originalName;

        public StoredFile(String url, String extension, long size, String originalName) {
            this.url = url;
            this.extension = extension;
            this.size = size;
            this.originalName = originalName;
        }
    }
}
