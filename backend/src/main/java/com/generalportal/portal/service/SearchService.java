package com.generalportal.portal.service;

import com.generalportal.portal.dto.Dtos.SearchResultDto;
import com.generalportal.portal.repository.EventRepository;
import com.generalportal.portal.repository.FinanceTransactionRepository;
import com.generalportal.portal.repository.ProposalRepository;
import com.generalportal.portal.repository.TaskRepository;
import com.generalportal.portal.repository.WorkspaceFileRepository;
import com.generalportal.portal.security.Permissions;
import java.util.List;
import java.util.Locale;
import java.util.stream.Stream;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SearchService {
    private final CurrentUserService currentUserService;
    private final PermissionService permissionService;
    private final TaskRepository taskRepository;
    private final ProposalRepository proposalRepository;
    private final EventRepository eventRepository;
    private final WorkspaceFileRepository workspaceFileRepository;
    private final FinanceTransactionRepository financeTransactionRepository;

    public SearchService(
        CurrentUserService currentUserService,
        PermissionService permissionService,
        TaskRepository taskRepository,
        ProposalRepository proposalRepository,
        EventRepository eventRepository,
        WorkspaceFileRepository workspaceFileRepository,
        FinanceTransactionRepository financeTransactionRepository
    ) {
        this.currentUserService = currentUserService;
        this.permissionService = permissionService;
        this.taskRepository = taskRepository;
        this.proposalRepository = proposalRepository;
        this.eventRepository = eventRepository;
        this.workspaceFileRepository = workspaceFileRepository;
        this.financeTransactionRepository = financeTransactionRepository;
    }

    @Transactional(readOnly = true)
    public List<SearchResultDto> search(String query) {
        permissionService.require(Permissions.SEARCH_READ);
        String normalizedQuery = query == null ? "" : query.toLowerCase(Locale.ROOT).trim();
        var workspace = currentUserService.currentWorkspace();

        if (normalizedQuery.isBlank()) {
            Stream<SearchResultDto> tasks = taskRepository.findByWorkspaceOrderByDueDateAsc(workspace).stream()
                .map(task -> new SearchResultDto(task.getId(), "Task", task.getTitle(), task.getProject(), task.getPriority()));
            Stream<SearchResultDto> proposals = proposalRepository.findByWorkspaceOrderBySubmittedAtDesc(workspace).stream()
                .map(proposal -> new SearchResultDto(proposal.getId(), "Proposal", proposal.getTitle(), proposal.getSummary(), proposal.getStatus()));
            Stream<SearchResultDto> events = eventRepository.findByWorkspaceOrderByStartsAtAsc(workspace).stream()
                .map(event -> new SearchResultDto(event.getId(), "Event", event.getTitle(), "Workspace event plan", event.getStatus()));
            Stream<SearchResultDto> files = workspaceFileRepository.findByWorkspaceOrderByFileUpdatedAtDesc(workspace).stream()
                .map(file -> new SearchResultDto(file.getId(), "File", file.getName(), file.getLinkedResource(), file.getFileType()));
            Stream<SearchResultDto> finance = financeTransactionRepository.findByWorkspaceOrderByOccurredAtDesc(workspace).stream()
                .map(transaction -> new SearchResultDto(transaction.getId(), "Finance", transaction.getTitle(), transaction.getCategory(), transaction.getStatus()));

            return Stream.of(tasks, proposals, events, files, finance)
                .flatMap(stream -> stream)
                .limit(20)
                .toList();
        }

        Stream<SearchResultDto> tasks = taskRepository.searchByWorkspace(workspace, normalizedQuery).stream()
            .map(task -> new SearchResultDto(task.getId(), "Task", task.getTitle(), task.getProject(), task.getPriority()));
        Stream<SearchResultDto> proposals = proposalRepository.searchByWorkspace(workspace, normalizedQuery).stream()
            .map(proposal -> new SearchResultDto(proposal.getId(), "Proposal", proposal.getTitle(), proposal.getSummary(), proposal.getStatus()));
        Stream<SearchResultDto> events = eventRepository.searchByWorkspace(workspace, normalizedQuery).stream()
            .map(event -> new SearchResultDto(event.getId(), "Event", event.getTitle(), "Workspace event plan", event.getStatus()));
        Stream<SearchResultDto> files = workspaceFileRepository.searchByWorkspace(workspace, normalizedQuery).stream()
            .map(file -> new SearchResultDto(file.getId(), "File", file.getName(), file.getLinkedResource(), file.getFileType()));
        Stream<SearchResultDto> finance = financeTransactionRepository.searchByWorkspace(workspace, normalizedQuery).stream()
            .map(transaction -> new SearchResultDto(transaction.getId(), "Finance", transaction.getTitle(), transaction.getCategory(), transaction.getStatus()));

        return Stream.of(tasks, proposals, events, files, finance)
            .flatMap(stream -> stream)
            .limit(20)
            .toList();
    }
}
