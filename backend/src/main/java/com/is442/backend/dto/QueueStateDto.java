package com.is442.backend.dto;

import java.util.List;

/**
 * Represents the complete state of a clinic's queue.
 */
public class QueueStateDto {
    private final String clinicId;
    private final long nowServing;
    private final int totalWaiting;
    private final List<QueueItemDto> queueItems;

    public QueueStateDto(String clinicId, long nowServing, int totalWaiting, List<QueueItemDto> queueItems) {
        this.clinicId = clinicId;
        this.nowServing = nowServing;
        this.totalWaiting = totalWaiting;
        this.queueItems = queueItems;
    }

    public String getClinicId() {
        return clinicId;
    }

    public long getNowServing() {
        return nowServing;
    }

    public int getTotalWaiting() {
        return totalWaiting;
    }

    public List<QueueItemDto> getQueueItems() {
        return queueItems;
    }
}

