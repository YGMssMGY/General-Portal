package com.generalportal.portal.service;

import com.generalportal.portal.dto.Dtos.CreateFinanceTransactionRequest;
import com.generalportal.portal.dto.Dtos.FinanceTransactionDto;
import com.generalportal.portal.entity.FinanceTransaction;
import com.generalportal.portal.exception.ResourceNotFoundException;
import com.generalportal.portal.repository.FinanceTransactionRepository;
import com.generalportal.portal.security.Permissions;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;
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

    @Transactional
    public FinanceTransactionDto createTransaction(CreateFinanceTransactionRequest request) {
        permissionService.require(Permissions.FINANCE_WRITE);
        var tx = new FinanceTransaction(currentUserService.currentWorkspace(), request.title(), request.category(), "pending", currentUserService.currentUser().getDisplayName(), request.amount(), Instant.now());
        return DtoMapper.toFinanceTransactionDto(financeTransactionRepository.save(tx));
    }

    @Transactional
    public FinanceTransactionDto updateTransactionStatus(UUID id, String status) {
        permissionService.require(Permissions.FINANCE_WRITE);
        FinanceTransaction tx = financeTransactionRepository.findById(Objects.requireNonNull(id)).orElseThrow(() -> new ResourceNotFoundException("FinanceTransaction"));
        tx.setStatus(status);
        return DtoMapper.toFinanceTransactionDto(tx);
    }

    @Transactional
    public void deleteTransaction(UUID id) {
        permissionService.require(Permissions.FINANCE_WRITE);
        financeTransactionRepository.deleteById(Objects.requireNonNull(id));
    }
}
