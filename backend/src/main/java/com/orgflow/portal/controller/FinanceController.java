package com.orgflow.portal.controller;

import com.orgflow.portal.dto.Dtos.FinanceTransactionDto;
import com.orgflow.portal.service.FinanceService;
import java.util.List;
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
    public List<FinanceTransactionDto> listTransactions() {
        return financeService.listTransactions();
    }
}
