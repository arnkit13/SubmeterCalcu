package com.submeter.billing.service;

import com.submeter.billing.dto.TenantRequest;
import com.submeter.billing.dto.TenantResponse;
import com.submeter.billing.entity.Tenant;
import com.submeter.billing.exception.ResourceNotFoundException;
import com.submeter.billing.repository.TenantRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class TenantService {

    private final TenantRepository tenantRepository;

    public TenantService(TenantRepository tenantRepository) {
        this.tenantRepository = tenantRepository;
    }

    public TenantResponse createTenant(TenantRequest request) {
        Tenant tenant = new Tenant();
        tenant.setName(request.name());
        tenant.setRoomNumber(request.roomNumber());
        
        Tenant savedTenant = tenantRepository.save(tenant);
        return TenantResponse.fromEntity(savedTenant);
    }

    @Transactional(readOnly = true)
    public List<TenantResponse> getAllTenants() {
        return tenantRepository.findAll().stream()
            .map(TenantResponse::fromEntity)
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public TenantResponse getTenantById(Long id) {
        Tenant tenant = tenantRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Tenant not found with ID: " + id));
        return TenantResponse.fromEntity(tenant);
    }

    public void deleteTenant(Long id) {
        if (!tenantRepository.existsById(id)) {
            throw new ResourceNotFoundException("Tenant not found with ID: " + id);
        }
        tenantRepository.deleteById(id);
    }
}
