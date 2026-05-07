package com.orgflow.portal.service;

import com.orgflow.portal.dto.Dtos.FinanceTransactionDto;
import com.orgflow.portal.repository.FinanceTransactionRepository;
import com.orgflow.portal.security.Permissions;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FinanceService {
    private final CurrentUserService currentUserService;
    private final PermissionService permissionService;
    private final FinanceTransactionRepository financeTransactionRepository;

    public FinanceService(CurrentUserService currentUserService, PermissionService permissionService, FinanceTransactionRepository financeTransactionRepository) {
        this.currentUserService = currentUserService;
        this.permissionService = permissionService;
        this.financeTransactionRepository = financeTransactionRepository;
    }

    @Transactional(readOnly = true)
    public Page<FinanceTransactionDto> listTransactions(Pageable pageable) {
        permissionService.require(Permissions.FINANCE_READ);
        return financeTransactionRepository.findByWorkspace(currentUserService.currentWorkspace(), pageable)
            .map(DtoMapper::toFinanceTransactionDto);
    }
}
