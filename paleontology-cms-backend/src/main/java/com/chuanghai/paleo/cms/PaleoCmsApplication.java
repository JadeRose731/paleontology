package com.chuanghai.paleo.cms;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@MapperScan("com.chuanghai.paleo.cms.mapper")
public class PaleoCmsApplication {

    public static void main(String[] args) {
        SpringApplication.run(PaleoCmsApplication.class, args);
    }
}
