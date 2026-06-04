package com.submeter.billing.controller;

import com.submeter.billing.dto.MeterReadingRequest;
import com.submeter.billing.dto.MeterReadingResponse;
import com.submeter.billing.service.MeterReadingService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/readings")
@CrossOrigin(origins = "*") // Allows frontend applications to fetch meter readings
public class MeterReadingController {

    private final MeterReadingService meterReadingService;

    public MeterReadingController(MeterReadingService meterReadingService) {
        this.meterReadingService = meterReadingService;
    }

    @PostMapping
    public ResponseEntity<MeterReadingResponse> addReading(@Valid @RequestBody MeterReadingRequest request) {
        MeterReadingResponse response = meterReadingService.addReading(request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping("/tenant/{tenantId}")
    public ResponseEntity<List<MeterReadingResponse>> getReadingsByTenantId(@PathVariable Long tenantId) {
        List<MeterReadingResponse> readings = meterReadingService.getReadingsByTenantId(tenantId);
        return ResponseEntity.ok(readings);
    }

    @GetMapping("/tenant/{tenantId}/latest")
    public ResponseEntity<MeterReadingResponse> getLatestReading(@PathVariable Long tenantId) {
        MeterReadingResponse latestReading = meterReadingService.getLatestReading(tenantId);
        return ResponseEntity.ok(latestReading);
    }
}
