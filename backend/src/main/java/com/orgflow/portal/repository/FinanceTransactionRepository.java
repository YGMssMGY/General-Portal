package com.orgflow.portal.repository;

import com.orgflow.portal.entity.FinanceTransaction;
import com.orgflow.portal.entity.Workspace;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FinanceTransactionRepository extends JpaRepository<FinanceTransaction, UUID> {
    List<FinanceTransaction> findByWorkspaceOrderByOccurredAtDesc(Workspace workspace);
}
