package com.is442.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import java.util.List;

@Configuration
public class QueueScriptsConfig {

    private static final String LUA_DEQUEUE = """
        local qkey = KEYS[1]
        local evkey = KEYS[2]
        local pprefix = ARGV[1]

        local popped = redis.call('ZPOPMIN', qkey, 1)
        if (not popped or #popped == 0) then
          return {false}
        end
        local pid = popped[1]
        local pkey = pprefix .. pid
        local pdata = redis.call('HGETALL', pkey)
        redis.call('DEL', pkey)
        redis.call('XADD', evkey, '*', 'type', 'DEQUEUE', 'pid', pid)

        local result = {pid}
        for i=1,#pdata,2 do
          table.insert(result, pdata[i])
          table.insert(result, pdata[i+1])
        end
        return result
        """;

    @Bean
    public DefaultRedisScript<List> dequeueScript() {
        return new DefaultRedisScript<>(LUA_DEQUEUE, List.class);
    }
}

