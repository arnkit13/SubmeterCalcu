package com.submeter.billing.repository;

import com.submeter.billing.entity.MeterReading;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MeterReadingRepository extends JpaRepository<MeterReading, Long> {
    
    // Retrieve all meter readings of a tenant sorted by date descending
    List<MeterReading> findByTenantIdOrderByReadingDateDesc(Long tenantId);

    // Find the latest reading of a tenant based on reading date and record ID
    Optional<MeterReading> findFirstByTenantIdOrderByReadingDateDescIdDesc(Long tenantId);
}
