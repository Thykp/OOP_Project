package com.is442.backend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Service
public class KafkaQueueEventProducer {
    // Topic name
    private static final String TOPIC_NAME = "clinic-queue-updates";

    @Autowired
    private KafkaTemplate<String, String> kafkaTemplate;

    public void sendQueueUpdate(String message) {
        System.out.println("Sending message to Kafka: " + message);
        kafkaTemplate.send(TOPIC_NAME, message);
    }
}
