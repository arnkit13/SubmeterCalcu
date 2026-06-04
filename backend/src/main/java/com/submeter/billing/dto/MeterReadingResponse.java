package com.submeter.billing.dto;

import com.submeter.billing.entity.MeterReading;
import java.time.LocalDate;

public record MeterReadingResponse(
    Long id,
    Long tenantId,
    String tenantName,
    Double previousReading,
    Double currentReading,
    Double consumption,
    LocalDate readingDate
) {
    public static MeterReadingResponse fromEntity(MeterReading reading) {
        return new MeterReadingResponse(
            reading.getId(),
            reading.getTenant().getId(),
            reading.getTenant().getName(),
            reading.getPreviousReading(),
            reading.getCurrentReading(),
            reading.getConsumption(),
            reading.getReadingDate()
        );
    }
}
