package com.submeter.billing.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record BillRequest(
    @NotNull(message = "Tenant ID is required")
    Long tenantId,

    @NotNull(message = "Rate per unit is required")
    @Min(value = 0, message = "Rate per unit cannot be negative")
    Double ratePerUnit,

    @NotBlank(message = "Billing month is required")
    String billingMonth
) {}
