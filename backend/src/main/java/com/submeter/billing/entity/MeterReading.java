package com.submeter.billing.entity;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "meter_readings")
public class MeterReading {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;

    @Column(name = "previous_reading", nullable = false)
    private Double previousReading;

    @Column(name = "current_reading", nullable = false)
    private Double currentReading;

    @Column(nullable = false)
    private Double consumption;

    @Column(name = "reading_date", nullable = false)
    private LocalDate readingDate;

    // Default constructor
    public MeterReading() {
    }

    // All-args constructor
    public MeterReading(Long id, Tenant tenant, Double previousReading, Double currentReading, Double consumption, LocalDate readingDate) {
        this.id = id;
        this.tenant = tenant;
        this.previousReading = previousReading;
        this.currentReading = currentReading;
        this.consumption = consumption;
        this.readingDate = readingDate;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Tenant getTenant() {
        return tenant;
    }

    public void setTenant(Tenant tenant) {
        this.tenant = tenant;
    }

    public Double getPreviousReading() {
        return previousReading;
    }

    public void setPreviousReading(Double previousReading) {
        this.previousReading = previousReading;
    }

    public Double getCurrentReading() {
        return currentReading;
    }

    public void setCurrentReading(Double currentReading) {
        this.currentReading = currentReading;
    }

    public Double getConsumption() {
        return consumption;
    }

    public void setConsumption(Double consumption) {
        this.consumption = consumption;
    }

    public LocalDate getReadingDate() {
        return readingDate;
    }

    public void setReadingDate(LocalDate readingDate) {
        this.readingDate = readingDate;
    }
}
