package com.is442.backend.controller;

import com.is442.backend.service.QueueSseService;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

@RestController
@RequestMapping("/api/stream")
public class QueueStreamController {
    private final QueueSseService sse;

    public QueueStreamController(QueueSseService sse) {
        this.sse = sse;
    }

    // Frontend subscribes: GET /api/stream/queues/{clinicId}
    @GetMapping(value = "/queues/{clinicId}", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<String>> clinicStream(@PathVariable String clinicId) {
        return sse.streamClinic(clinicId);
    }
}
