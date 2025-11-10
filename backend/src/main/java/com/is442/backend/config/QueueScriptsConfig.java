package com.is442.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import java.util.List;

@Configuration
public class QueueScriptsConfig {

    private static final String LUA_DEQUEUE = """
              local qkey    = KEYS[1]
              local nskey   = KEYS[2]        -- clinic:{id}:nowServing
              local pprefix = ARGV[1]

              local popped = redis.call('ZPOPMIN', qkey, 1)
              if (not popped or #popped == 0) then
                return {false}
              end

              local pid   = popped[1]
              local pkey  = pprefix .. pid
              local pdata = redis.call('HGETALL', pkey)

              -- read served seq from hash (authoritative ticket number)
              local seq = tonumber(redis.call('HGET', pkey, 'seq')) or 0

              -- remove the appointment hash once read
              redis.call('DEL', pkey)

              -- set nowServing := seq (preferred over INCR so it always matches ticket numbers)
              redis.call('SET', nskey, tostring(seq))

              -- return [pid, nowServing, ...pdata as k1,v1,k2,v2,...]
              -- pdata includes all appointment fields including doctor info (updated in Java before dequeue)
              local result = { pid, tostring(seq) }
              for i=1,#pdata,2 do
                table.insert(result, pdata[i])
                table.insert(result, pdata[i+1])
              end
              return result
            """;

    private static final String LUA_ENQUEUE = """
              local seqKey   = KEYS[1]
              local queueKey = KEYS[2]
              local hashKey  = KEYS[3]

              local appointmentId = ARGV[1]
              local payloadCount  = tonumber(ARGV[2]) -- number of key/value pairs following

              -- 1) allocate sequence
              local seq = redis.call('INCR', seqKey)

              -- 2) write hash fields
              for i=1,payloadCount*2,2 do
                redis.call('HSET', hashKey, ARGV[2+i], ARGV[3+i])
              end
              redis.call('HSET', hashKey, 'seq', tostring(seq))

              -- 3) enqueue in ZSET
              redis.call('ZADD', queueKey, seq, appointmentId)

              return tostring(seq)
            """;

    @Bean
    public DefaultRedisScript<List> dequeueScript() {
        return new DefaultRedisScript<>(LUA_DEQUEUE, List.class);
    }

    @Bean
    public DefaultRedisScript<Long> enqueueScript() {
        return new DefaultRedisScript<>(LUA_ENQUEUE, Long.class);
    }
}
