package com.submeter.billing.controller;

import com.submeter.billing.dto.BillRequest;
import com.submeter.billing.dto.BillResponse;
import com.submeter.billing.service.BillService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bills")
@CrossOrigin(origins = "*") // Allows the frontend application to generate and fetch bills
public class BillController {

    private final BillService billService;

    public BillController(BillService billService) {
        this.billService = billService;
    }

    @PostMapping
    public ResponseEntity<BillResponse> generateBill(@Valid @RequestBody BillRequest request) {
        BillResponse response = billService.generateBill(request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping("/tenant/{tenantId}")
    public ResponseEntity<List<BillResponse>> getBillsByTenantId(@PathVariable Long tenantId) {
        List<BillResponse> bills = billService.getBillsByTenantId(tenantId);
        return ResponseEntity.ok(bills);
    }
}
