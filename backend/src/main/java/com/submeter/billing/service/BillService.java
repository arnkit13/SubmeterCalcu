package com.submeter.billing.service;

import com.submeter.billing.dto.BillRequest;
import com.submeter.billing.dto.BillResponse;
import com.submeter.billing.entity.Bill;
import com.submeter.billing.entity.MeterReading;
import com.submeter.billing.entity.Tenant;
import com.submeter.billing.exception.InvalidInputException;
import com.submeter.billing.exception.ResourceNotFoundException;
import com.submeter.billing.repository.BillRepository;
import com.submeter.billing.repository.MeterReadingRepository;
import com.submeter.billing.repository.TenantRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class BillService {

    private final BillRepository billRepository;
    private final TenantRepository tenantRepository;
    private final MeterReadingRepository meterReadingRepository;

    public BillService(BillRepository billRepository, TenantRepository tenantRepository, MeterReadingRepository meterReadingRepository) {
        this.billRepository = billRepository;
        this.tenantRepository = tenantRepository;
        this.meterReadingRepository = meterReadingRepository;
    }

    public BillResponse generateBill(BillRequest request) {
        Tenant tenant = tenantRepository.findById(request.tenantId())
            .orElseThrow(() -> new ResourceNotFoundException("Tenant not found with ID: " + request.tenantId()));

        // Business Rule: billing is always based on the latest meter reading of a tenant
        MeterReading latestReading = meterReadingRepository.findFirstByTenantIdOrderByReadingDateDescIdDesc(request.tenantId())
            .orElseThrow(() -> new ResourceNotFoundException("No meter reading found for tenant with ID: " + request.tenantId() + ". A bill cannot be generated without a meter reading."));

        double rate = request.ratePerUnit();
        if (rate < 0) {
            throw new InvalidInputException("Rate per unit cannot be negative values.");
        }

        double consumption = latestReading.getConsumption();
        double totalAmount = consumption * rate;

        Bill bill = new Bill();
        bill.setTenant(tenant);
        bill.setConsumption(consumption);
        bill.setRatePerUnit(rate);
        bill.setTotalAmount(totalAmount);
        bill.setBillingMonth(request.billingMonth());

        Bill savedBill = billRepository.save(bill);
        return BillResponse.fromEntity(savedBill);
    }

    @Transactional(readOnly = true)
    public List<BillResponse> getBillsByTenantId(Long tenantId) {
        if (!tenantRepository.existsById(tenantId)) {
            throw new ResourceNotFoundException("Tenant not found with ID: " + tenantId);
        }
        return billRepository.findByTenantIdOrderByIdDesc(tenantId).stream()
            .map(BillResponse::fromEntity)
            .collect(Collectors.toList());
    }
}
