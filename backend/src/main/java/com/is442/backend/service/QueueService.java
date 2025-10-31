package com.is442.backend.service;

import com.is442.backend.model.QueueState;
import com.is442.backend.model.QueueTicket;
import com.is442.backend.repository.QueueStateRepository;
import com.is442.backend.repository.QueueTicketRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.lang.Nullable;

import java.util.*;

@Service
public class QueueService {

    private final QueueStateRepository stateRepo;
    private final QueueTicketRepository ticketRepo;
    private final NotificationEventProducer notificationProducer; 

    // public QueueService(QueueStateRepository stateRepo, QueueTicketRepository ticketRepo,
    //                     NotificationEventProducer notificationProducer) {
    //     this.stateRepo = stateRepo;
    //     this.ticketRepo = ticketRepo;
    //     this.notificationProducer = notificationProducer;
    // }
    
    public QueueService(
            QueueStateRepository stateRepo,
            QueueTicketRepository ticketRepo,
            @Nullable NotificationEventProducer notificationProducer   // ✅ allow Spring to inject null
    ) {
        this.stateRepo = stateRepo;
        this.ticketRepo = ticketRepo;
        this.notificationProducer = notificationProducer;
    }


    public record Next(String appointmentId, String patientId, int position) {}
    public record Snapshot(String clinicId, Integer position, int nowServing) {}

    @Transactional
    public int checkIn(String clinicId, String apptId, String patientId, String idempotencyKey) {
        UUID appt = UUID.fromString(apptId);
        UUID pid  = (patientId == null || patientId.isBlank()) ? null : UUID.fromString(patientId);

        // idempotency by unique (clinic, appointment)
        var existing = ticketRepo.findByClinicIdAndAppointmentId(clinicId, appt);
        if (existing.isPresent()) return existing.get().getPosition();

        int nextPos = nextPositionForClinic(clinicId);
        var t = new QueueTicket(clinicId, appt, pid, nextPos);
        ticketRepo.save(t);

        // 3-away notification trigger (optional; only if we know patient)
        maybeNotifyThreeAway(clinicId, apptId, patientId);

        return nextPos;
    }

    @Transactional
    public Next callNext(String clinicId) {
        // now-serving pointer ++
        QueueState st = stateRepo.findById(clinicId).orElseGet(() -> stateRepo.save(new QueueState(clinicId)));
        int ns = st.getNowServing() + 1;
        st.setNowServing(ns);
        stateRepo.save(st);

        // mark ticket SERVED if matches ns
        ticketRepo.findFirstByClinicIdAndStatusOrderByPositionAsc(clinicId, "WAITING").ifPresent(t -> {
            if (t.getPosition() == ns) {
                t.setStatus("SERVED");
                ticketRepo.save(t);
            }
        });

        // lookup appt/patient at that position for event/notification context
        String apptId = null, patientId = null;
        Optional<QueueTicket> match = ticketRepo.findByClinicIdAndStatusOrderByPositionAsc(clinicId, "SERVED").stream()
                .filter(t -> t.getPosition() == ns).findFirst();
        if (match.isPresent()) {
            apptId = match.get().getAppointmentId().toString();
            patientId = match.get().getPatientId() != null ? match.get().getPatientId().toString() : null;
        }

        // notify the specific patient
        maybeNotifyNowServing(clinicId, apptId, patientId);

        return new Next(apptId, patientId, ns);
    }

    @Transactional(readOnly = true)
    public Snapshot currentForAppointment(String appointmentId) {

        UUID appt = UUID.fromString(appointmentId);

        return ticketRepo.findAll().stream()
                .filter(t -> t.getAppointmentId().equals(appt))
                .findFirst()
                .map(t -> {
                    int ns = stateRepo.findById(t.getClinicId()).map(QueueState::getNowServing).orElse(0);
                    return new Snapshot(t.getClinicId(), t.getPosition(), ns);
                })
                .orElseGet(() -> new Snapshot(null, null, 0));
    }

    private int nextPositionForClinic(String clinicId) {
        // get current tail (max position) and add 1
        return ticketRepo.findFirstByClinicIdOrderByPositionDesc(clinicId)
                .map(t -> t.getPosition() + 1)
                .orElse(1);
    }

    public void maybeNotifyThreeAway(String clinicId, String apptId, String patientId) {
        if (patientId == null || notificationProducer == null) return;
        // Check if position is 3: caller has the computed position; here we recompute:
        var pos = ticketRepo.findByClinicIdAndAppointmentId(clinicId, UUID.fromString(apptId))
                .map(QueueTicket::getPosition).orElse(null);
        if (pos != null) {
            var ns = stateRepo.findById(clinicId).map(QueueState::getNowServing).orElse(0);
            if (pos - ns == 3) {
                // Publish NotificationEvent -> TODO (Kendrick)
            }
        }
    }

    public void maybeNotifyNowServing(String clinicId, String apptId, String patientId) {
        if (patientId == null || notificationProducer == null) return;
        // Publish NotificationEvent("NOW_SERVING", ...) -> TODO (Kendrick)
    }
}
