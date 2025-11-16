package com.is442.backend.dto;

public class QueueStatus {
    private final String clinicId;
    private final long nowServing;  // last served seq
    private final int totalWaiting;

    public QueueStatus(String clinicId, long nowServing, int totalWaiting) {
        this.clinicId = clinicId;
        this.nowServing = nowServing;
        this.totalWaiting = totalWaiting;
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
}

