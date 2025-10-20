package com.is442.backend.model;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "queue_state")
public class QueueState {
    @Id
    @Column(name = "clinic_id", nullable = false)
    private String clinicId;

    @Column(name = "now_serving", nullable = false)
    private int nowServing = 0;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt = OffsetDateTime.now();

    public QueueState() {}
    public QueueState(String clinicId) { this.clinicId = clinicId; }

    public String getClinicId() { return clinicId; }
    public int getNowServing() { return nowServing; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }

    public void setNowServing(int nowServing) { this.nowServing = nowServing; this.updatedAt = OffsetDateTime.now(); }
}
