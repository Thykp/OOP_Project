package com.is442.backend.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;

@Configuration
public class RedisConfig {

    // StringRedisTemplate for ZSET operations & simple string fields
    @Bean
    public StringRedisTemplate stringRedisTemplate(RedisConnectionFactory cf) {
        return new StringRedisTemplate(cf);
    }


    // 2) Add a JSON-capable RedisTemplate for richer HASH values (optional)
    @Bean
    public RedisTemplate<String, Object> jsonRedisTemplate(
            RedisConnectionFactory cf,
            ObjectMapper objectMapper
    ) {
        RedisTemplate<String, Object> tpl = new RedisTemplate<>();
        tpl.setConnectionFactory(cf);
        var keySer = new StringRedisSerializer();
        var jsonSer = new GenericJackson2JsonRedisSerializer(objectMapper);

        tpl.setKeySerializer(keySer);
        tpl.setHashKeySerializer(keySer);
        tpl.setValueSerializer(jsonSer);
        tpl.setHashValueSerializer(jsonSer);
        tpl.afterPropertiesSet();
        return tpl;
    }

    // Shared ObjectMapper (dates as ISO strings)
    @Bean
    public ObjectMapper objectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        return mapper;
    }
}
