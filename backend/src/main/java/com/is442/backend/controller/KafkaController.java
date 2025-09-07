package com.is442.backend.controller;

import com.is442.backend.service.KafkaQueueEventProducer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class KafkaController {
    @Autowired
    private KafkaQueueEventProducer producer;

    @GetMapping("/test-kafka")
    public String testKafka(@RequestParam String message) {
        producer.sendQueueUpdate(message);
        return "Message sent to Kafka!";
    }
}
