package com.submeter.billing.service;

import com.submeter.billing.dto.MeterReadingRequest;
import com.submeter.billing.dto.MeterReadingResponse;
import com.submeter.billing.entity.MeterReading;
import com.submeter.billing.entity.Tenant;
import com.submeter.billing.exception.InvalidInputException;
import com.submeter.billing.exception.ResourceNotFoundException;
import com.submeter.billing.repository.MeterReadingRepository;
import com.submeter.billing.repository.TenantRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class MeterReadingService {

    private final MeterReadingRepository meterReadingRepository;
    private final TenantRepository tenantRepository;

    public MeterReadingService(MeterReadingRepository meterReadingRepository, TenantRepository tenantRepository) {
        this.meterReadingRepository = meterReadingRepository;
        this.tenantRepository = tenantRepository;
    }

    public MeterReadingResponse addReading(MeterReadingRequest request) {
        Tenant tenant = tenantRepository.findById(request.tenantId())
            .orElseThrow(() -> new ResourceNotFoundException("Tenant not found with ID: " + request.tenantId()));

        double previous = request.previousReading();
        double current = request.currentReading();

        // Business Rule validation
        if (previous < 0 || current < 0) {
            throw new InvalidInputException("Meter readings cannot be negative values.");
        }

        if (current < previous) {
            throw new InvalidInputException("Current reading (" + current + " kWh) cannot be less than previous reading (" + previous + " kWh).");
        }

        double consumption = current - previous;

        MeterReading reading = new MeterReading();
        reading.setTenant(tenant);
        reading.setPreviousReading(previous);
        reading.setCurrentReading(current);
        reading.setConsumption(consumption);
        reading.setReadingDate(request.readingDate());

        MeterReading savedReading = meterReadingRepository.save(reading);
        return MeterReadingResponse.fromEntity(savedReading);
    }

    @Transactional(readOnly = true)
    public List<MeterReadingResponse> getReadingsByTenantId(Long tenantId) {
        if (!tenantRepository.existsById(tenantId)) {
            throw new ResourceNotFoundException("Tenant not found with ID: " + tenantId);
        }
        return meterReadingRepository.findByTenantIdOrderByReadingDateDesc(tenantId).stream()
            .map(MeterReadingResponse::fromEntity)
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public MeterReadingResponse getLatestReading(Long tenantId) {
        if (!tenantRepository.existsById(tenantId)) {
            throw new ResourceNotFoundException("Tenant not found with ID: " + tenantId);
        }
        MeterReading latestReading = meterReadingRepository.findFirstByTenantIdOrderByReadingDateDescIdDesc(tenantId)
            .orElseThrow(() -> new ResourceNotFoundException("No meter readings found for tenant with ID: " + tenantId));
        return MeterReadingResponse.fromEntity(latestReading);
    }
}
