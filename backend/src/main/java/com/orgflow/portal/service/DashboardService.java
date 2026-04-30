package com.orgflow.portal.service;

import com.orgflow.portal.dto.Dtos.AttentionItemDto;
import com.orgflow.portal.dto.Dtos.DashboardDto;
import com.orgflow.portal.dto.Dtos.DashboardMetricDto;
import com.orgflow.portal.dto.Dtos.EventDto;
import com.orgflow.portal.dto.Dtos.TaskDto;
import com.orgflow.portal.entity.FinanceTransaction;
import com.orgflow.portal.entity.TaskItem;
import com.orgflow.portal.repository.ActivityLogRepository;
import com.orgflow.portal.repository.EventRepository;
import com.orgflow.portal.repository.FinanceTransactionRepository;
import com.orgflow.portal.repository.MessageThreadRepository;
import com.orgflow.portal.repository.ProposalRepository;
import com.orgflow.portal.repository.TaskRepository;
import com.orgflow.portal.security.Permissions;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DashboardService {
    private final CurrentUserService currentUserService;
    private final PermissionService permissionService;
    private final TaskRepository taskRepository;
    private final ProposalRepository proposalRepository;
    private final EventRepository eventRepository;
    private final FinanceTransactionRepository financeTransactionRepository;
    private final ActivityLogRepository activityLogRepository;
    private final MessageThreadRepository messageThreadRepository;

    public DashboardService(
        CurrentUserService currentUserService,
        PermissionService permissionService,
        TaskRepository taskRepository,
        ProposalRepository proposalRepository,
        EventRepository eventRepository,
        FinanceTransactionRepository financeTransactionRepository,
        ActivityLogRepository activityLogRepository,
        MessageThreadRepository messageThreadRepository
    ) {
        this.currentUserService = currentUserService;
        this.permissionService = permissionService;
        this.taskRepository = taskRepository;
        this.proposalRepository = proposalRepository;
        this.eventRepository = eventRepository;
        this.financeTransactionRepository = financeTransactionRepository;
        this.activityLogRepository = activityLogRepository;
        this.messageThreadRepository = messageThreadRepository;
    }

    @Transactional(readOnly = true)
    public DashboardDto getDashboard() {
        permissionService.require(Permissions.DASHBOARD_READ);
        var workspace = currentUserService.currentWorkspace();
        List<TaskItem> tasks = taskRepository.findByWorkspaceOrderByDueDateAsc(workspace);
        var proposals = proposalRepository.findByWorkspaceOrderBySubmittedAtDesc(workspace);
        var events = eventRepository.findByWorkspaceOrderByStartsAtAsc(workspace);
        var transactions = financeTransactionRepository.findByWorkspaceOrderByOccurredAtDesc(workspace);

        long openTasks = tasks.stream().filter(task -> !"done".equals(task.getStatus())).count();
        long overdueTasks = tasks.stream()
            .filter(task -> !"done".equals(task.getStatus()))
            .filter(task -> task.getDueDate().isBefore(LocalDate.now()))
            .count();
        BigDecimal pendingFinance = transactions.stream()
            .filter(transaction -> "pending".equals(transaction.getStatus()) || "under_review".equals(transaction.getStatus()))
            .map(FinanceTransaction::getAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        long unreadThreads = messageThreadRepository.countByWorkspaceAndUnreadCountGreaterThan(workspace, 0);

        List<DashboardMetricDto> metrics = List.of(
            new DashboardMetricDto("Pending Proposals", String.valueOf(proposalRepository.countByWorkspaceAndStatus(workspace, "pending")), "tertiary", "proposal"),
            new DashboardMetricDto("Open Tasks", String.valueOf(openTasks), "primary", "task"),
            new DashboardMetricDto("Overdue Tasks", String.valueOf(overdueTasks), "danger", "warning"),
            new DashboardMetricDto("Unread Threads", String.valueOf(unreadThreads), "secondary", "message"),
            new DashboardMetricDto("Finance Pending", NumberFormat.getCurrencyInstance(Locale.US).format(pendingFinance), "primary", "finance")
        );

        List<AttentionItemDto> attention = tasks.stream()
            .filter(task -> "blocked".equals(task.getStatus()) || task.getDueDate().isBefore(LocalDate.now()))
            .limit(2)
            .map(task -> new AttentionItemDto(task.getId(), "Task", task.getTitle(), task.getAssigneeName(), "Due " + task.getDueDate(), "danger"))
            .toList();

        List<TaskDto> myTasks = tasks.stream().limit(2).map(DtoMapper::toTaskDto).toList();
        List<EventDto> upcomingEvents = events.stream().limit(2).map(DtoMapper::toEventDto).toList();

        return new DashboardDto(
            metrics,
            attention,
            myTasks,
            upcomingEvents,
            activityLogRepository.findTop2ByWorkspaceOrderByOccurredAtDesc(workspace).stream()
                .map(DtoMapper::toActivityDto)
                .toList()
        );
    }
}