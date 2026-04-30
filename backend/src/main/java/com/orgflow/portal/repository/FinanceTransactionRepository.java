package com.orgflow.portal.repository;

import com.orgflow.portal.entity.FinanceTransaction;
import com.orgflow.portal.entity.Workspace;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FinanceTransactionRepository extends JpaRepository<FinanceTransaction, UUID> {
    List<FinanceTransaction> findByWorkspaceOrderByOccurredAtDesc(Workspace workspace);

    @Query("SELECT f FROM FinanceTransaction f WHERE f.workspace = :workspace AND (LOWER(f.title) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(f.category) LIKE LOWER(CONCAT('%', :query, '%')))")
    List<FinanceTransaction> searchByWorkspace(@Param("workspace") Workspace workspace, @Param("query") String query);
}
