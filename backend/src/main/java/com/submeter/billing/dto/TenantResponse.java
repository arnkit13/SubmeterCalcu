package com.submeter.billing.dto;

import com.submeter.billing.entity.Tenant;

public record TenantResponse(
    Long id,
    String name,
    String roomNumber
) {
    public static TenantResponse fromEntity(Tenant tenant) {
        return new TenantResponse(
            tenant.getId(),
            tenant.getName(),
            tenant.getRoomNumber()
        );
    }
}
