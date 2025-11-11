package com.is442.backend.service;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(name = "kafka.enabled", havingValue = "true")
public class NotificationEventConsumer {

    @KafkaListener(
        topics = "notification-events",
        groupId = "notification-loggers",
        containerFactory = "kafkaListenerContainerFactory",
        autoStartup = "true"
    )
    public void onMessage(
        String payload,
        @Header(value = KafkaHeaders.RECEIVED_TOPIC, required = false) String topic,
        @Header(value = KafkaHeaders.RECEIVED_PARTITION, required = false) Integer partition,
        @Header(value = KafkaHeaders.OFFSET, required = false) Long offset
    ) {
        System.out.printf(
            "[NotificationEventConsumer] topic=%s partition=%s offset=%s payload=%s%n",
            topic, partition, offset, payload
        );
    }
}
