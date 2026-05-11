package com.generalportal.portal.controller;

import com.generalportal.portal.dto.Dtos.FinanceTransactionDto;
import com.generalportal.portal.dto.Dtos.CreateFinanceTransactionRequest;
import com.generalportal.portal.service.FinanceService;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.Objects;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/finance")
public class FinanceController {
    private final FinanceService financeService;

    public FinanceController(FinanceService financeService) {
        this.financeService = financeService;
    }

    @GetMapping("/transactions")
    @PreAuthorize("hasAuthority('finance:read')")
    public Page<FinanceTransactionDto> listTransactions(@PageableDefault(size = 25) Pageable pageable) {
        return financeService.listTransactions(pageable);
    }

    @PostMapping("/transactions")
    @PreAuthorize("hasAuthority('finance:write')")
    public ResponseEntity<FinanceTransactionDto> createTransaction(@Valid @RequestBody CreateFinanceTransactionRequest request) {
        FinanceTransactionDto tx = financeService.createTransaction(request);
        return ResponseEntity.created(Objects.requireNonNull(URI.create("/api/finance/transactions/" + tx.id()))).body(tx);
    }

    @PatchMapping("/transactions/{id}")
    @PreAuthorize("hasAuthority('finance:write')")
    public FinanceTransactionDto updateTransaction(@PathVariable UUID id, @RequestBody UpdateTransactionStatusRequest request) {
        return financeService.updateTransactionStatus(id, request.status());
    }

    @DeleteMapping("/transactions/{id}")
    @PreAuthorize("hasAuthority('finance:write')")
    public ResponseEntity<Void> deleteTransaction(@PathVariable UUID id) {
        financeService.deleteTransaction(id);
        return ResponseEntity.noContent().build();
    }

    public record UpdateTransactionStatusRequest(String status) {}
}
