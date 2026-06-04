package com.submeter.billing.dto;

import jakarta.validation.constraints.NotBlank;

public record TenantRequest(
    @NotBlank(message = "Tenant name is required")
    String name,

    @NotBlank(message = "Room number is required")
    String roomNumber
) {}
