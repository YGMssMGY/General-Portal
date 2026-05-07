package com.orgflow.portal.controller;

import com.orgflow.portal.dto.Dtos.FinanceTransactionDto;
import com.orgflow.portal.service.FinanceService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
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
}
