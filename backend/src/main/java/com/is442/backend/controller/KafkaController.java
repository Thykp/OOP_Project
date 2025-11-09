package com.is442.backend.controller;

import com.is442.backend.service.KafkaQueueEventProducer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class KafkaController {
    @Autowired(required = false)
    private KafkaQueueEventProducer producer;
    @ConditionalOnProperty(name = "kafka.enabled", havingValue = "true")   // 👈 add this


    @GetMapping("/test-kafka")
    public String testKafka(@RequestParam String message) {
        producer.sendQueueUpdate(message);
        return "Message sent to Kafka!";
    }
}
