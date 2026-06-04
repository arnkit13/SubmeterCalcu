package com.submeter.billing.repository;

import com.submeter.billing.entity.Bill;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BillRepository extends JpaRepository<Bill, Long> {
    
    // Retrieve all bills of a tenant sorted by ID descending (latest first)
    List<Bill> findByTenantIdOrderByIdDesc(Long tenantId);
}
