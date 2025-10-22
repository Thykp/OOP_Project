package com.is442.backend.dto;

public class PositionSnapshot {
    private final String clinicId;
    private final int position;     // 1-based; 0 if served/not in queue
    private final long nowServing;  // last served seq

    public PositionSnapshot(String clinicId, int position, long nowServing) {
        this.clinicId = clinicId;
        this.position = position;
        this.nowServing = nowServing;
    }

    public String getClinicId() { return clinicId; }
    public int getPosition() { return position; }
    public long getNowServing() { return nowServing; }
}

