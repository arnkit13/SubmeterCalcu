package com.submeter.billing.dto;

import com.submeter.billing.entity.Bill;

public record BillResponse(
    Long id,
    Long tenantId,
    String tenantName,
    Double consumption,
    Double ratePerUnit,
    Double totalAmount,
    String billingMonth
) {
    public static BillResponse fromEntity(Bill bill) {
        return new BillResponse(
            bill.getId(),
            bill.getTenant().getId(),
            bill.getTenant().getName(),
            bill.getConsumption(),
            bill.getRatePerUnit(),
            bill.getTotalAmount(),
            bill.getBillingMonth()
        );
    }
}
