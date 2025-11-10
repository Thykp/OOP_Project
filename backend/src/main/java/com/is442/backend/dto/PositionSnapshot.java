package com.is442.backend.dto;

public record PositionSnapshot(
        String clinicId,
        int position,
        long nowServing,
        long queueNumber        // NEW
) {
    public Object getNowServing() {
        return nowServing;
    }

    public Object getPosition() {
        return position;
    }

    public Object getClinicId() {
        return clinicId;
    }
}


