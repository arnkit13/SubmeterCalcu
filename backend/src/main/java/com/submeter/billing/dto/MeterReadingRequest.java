package com.submeter.billing.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record MeterReadingRequest(
    @NotNull(message = "Tenant ID is required")
    Long tenantId,

    @NotNull(message = "Previous reading is required")
    @Min(value = 0, message = "Previous reading cannot be negative")
    Double previousReading,

    @NotNull(message = "Current reading is required")
    @Min(value = 0, message = "Current reading cannot be negative")
    Double currentReading,

    @NotNull(message = "Reading date is required")
    LocalDate readingDate
) {}
