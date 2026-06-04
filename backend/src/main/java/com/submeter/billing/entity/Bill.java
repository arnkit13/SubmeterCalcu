package com.submeter.billing.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "bills")
public class Bill {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;

    @Column(nullable = false)
    private Double consumption;

    @Column(name = "rate_per_unit", nullable = false)
    private Double ratePerUnit;

    @Column(name = "total_amount", nullable = false)
    private Double totalAmount;

    @Column(name = "billing_month", nullable = false)
    private String billingMonth;

    // Default constructor
    public Bill() {
    }

    // All-args constructor
    public Bill(Long id, Tenant tenant, Double consumption, Double ratePerUnit, Double totalAmount, String billingMonth) {
        this.id = id;
        this.tenant = tenant;
        this.consumption = consumption;
        this.ratePerUnit = ratePerUnit;
        this.totalAmount = totalAmount;
        this.billingMonth = billingMonth;
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

    public Double getConsumption() {
        return consumption;
    }

    public void setConsumption(Double consumption) {
        this.consumption = consumption;
    }

    public Double getRatePerUnit() {
        return ratePerUnit;
    }

    public void setRatePerUnit(Double ratePerUnit) {
        this.ratePerUnit = ratePerUnit;
    }

    public Double getTotalAmount() {
        return totalAmount;
    }

    public void setTotalAmount(Double totalAmount) {
        this.totalAmount = totalAmount;
    }

    public String getBillingMonth() {
        return billingMonth;
    }

    public void setBillingMonth(String billingMonth) {
        this.billingMonth = billingMonth;
    }
}
