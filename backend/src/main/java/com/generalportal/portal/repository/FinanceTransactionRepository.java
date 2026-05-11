package com.orgflow.portal.repository;

import com.orgflow.portal.entity.FinanceTransaction;
import com.orgflow.portal.entity.Workspace;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface FinanceTransactionRepository extends JpaRepository<FinanceTransaction, UUID> {
    List<FinanceTransaction> findByWorkspaceOrderByOccurredAtDesc(Workspace workspace);

    Page<FinanceTransaction> findByWorkspace(Workspace workspace, Pageable pageable);

    @Query("SELECT f FROM FinanceTransaction f WHERE f.workspace = :workspace AND LOWER(f.title) LIKE %:query%")
    List<FinanceTransaction> searchByWorkspace(Workspace workspace, String query);
}
