package com.is442.backend.service;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Sinks;

@Service
public class QueueSseService {

    private final Map<String, Sinks.Many<String>> clinicSinks = new ConcurrentHashMap<>();

    private Sinks.Many<String> sinkForClinic(String clinicId) {
        return clinicSinks.computeIfAbsent(clinicId,
                id -> Sinks.many().multicast().onBackpressureBuffer());
    }

    public void publishToClinic(String clinicId, String json) {
        sinkForClinic(clinicId).tryEmitNext(json);
    }

    public Flux<ServerSentEvent<String>> streamClinic(String clinicId) {
        // Keep-alive heartbeat so connections don’t time out on proxies
        Flux<ServerSentEvent<String>> heartbeat = Flux.interval(Duration.ofSeconds(15))
                .map(i -> ServerSentEvent.<String>builder()
                        .event("heartbeat")
                        .data("💓")
                        .build());

        Flux<ServerSentEvent<String>> events = sinkForClinic(clinicId).asFlux()
                .map(payload -> ServerSentEvent.<String>builder()
                        .event("queue-event")
                        .data(payload)
                        .build());

        return Flux.merge(events, heartbeat);
    }
}
