package com.is442.backend.service;

import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

@Service
public class KafkaQueueEventConsumer {
    @KafkaListener(topics = "clinic-queue-updates", groupId = "clinic-queue-group")
    public void listen(String message) {
        System.out.println("Received message from Kafka: " + message);

        // Here, you would implement the logic to process the message.
        // For example, you could update the queue in your Redis cache
        // or broadcast the update to connected WebSockets.
        // Example: myRedisService.updateQueue(message);
    }
}
