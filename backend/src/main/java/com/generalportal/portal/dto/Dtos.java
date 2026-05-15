package com.generalportal.portal.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class Dtos {
    private Dtos() {
    }

    public record UserDto(UUID id, String displayName, String email, String avatarUrl, UUID workspaceId, String workspaceName, String role, List<String> permissions) {
    }

    public record DashboardMetricDto(String label, String value, String tone, String icon) {
    }

    public record AttentionItemDto(UUID id, String label, String title, String owner, String dueLabel, String tone) {
    }

    public record DashboardDto(
        List<DashboardMetricDto> metrics,
        List<AttentionItemDto> attention,
        List<TaskDto> myTasks,
        List<EventDto> upcomingEvents,
        List<ActivityDto> recentActivity
    ) {
    }

    public record TaskDto(
        UUID id,
        String title,
        String status,
        String priority,
        String project,
        LocalDate dueDate,
        String assigneeName,
        int progress,
        String blockedReason
    ) {
    }

    public record CreateTaskRequest(
        @NotBlank String title,
        @NotBlank String priority,
        @NotBlank String project,
        @NotNull LocalDate dueDate,
        @NotBlank String assigneeName
    ) {
    }

    public record UpdateTaskRequest(
        @NotBlank String title,
        @NotBlank String status,
        @NotBlank String priority,
        @NotBlank String project,
        @NotNull LocalDate dueDate,
        @NotBlank String assigneeName,
        @Min(0) @Max(100) int progress,
        String blockedReason
    ) {
    }

    public record ProposalDto(
        UUID id,
        String title,
        String type,
        String status,
        String submittedBy,
        Instant submittedAt,
        BigDecimal budget,
        String summary
    ) {
    }

    public record CreateProposalRequest(
        @NotBlank String title,
        @NotBlank String type,
        @NotBlank String submittedBy,
        @NotNull @DecimalMin("0.00") BigDecimal budget,
        @NotBlank String summary
    ) {
    }

    public record EventDto(
        UUID id,
        String title,
        String status,
        Instant startsAt,
        Instant endsAt,
        int progress,
        BigDecimal budgetUsed,
        BigDecimal budgetTotal,
        List<String> ownerNames
    ) {
    }

    public record VolunteerSlotDto(UUID id, String title, String eventName, Instant startsAt, int capacity, int filled, int hours) {
    }

    public record FinanceTransactionDto(
        UUID id,
        String title,
        String category,
        String status,
        String submittedBy,
        BigDecimal amount,
        Instant occurredAt
    ) {
    }

    public record MessageDto(UUID id, String authorName, String body, Instant sentAt) {
    }

    public record MessageThreadDto(
        UUID id,
        String title,
        String context,
        String status,
        String preview,
        int unreadCount,
        Instant updatedAt,
        List<String> participants,
        List<MessageDto> messages
    ) {
    }

    public record WorkspaceFileDto(UUID id, String name, String fileType, String ownerName, String linkedResource, String sizeLabel, Instant updatedAt) {
    }

    public record MemberDto(
        UUID id,
        UserDto user,
        String position,
        String accessLabel,
        int taskCount,
        int volunteerHours,
        List<String> permissions
    ) {
    }

    public record ActivityDto(UUID id, String actorName, String action, String resourceType, String resourceTitle, Instant occurredAt) {
    }

    public record WorkspaceSettingsDto(
        String workspaceName,
        String defaultVisibility,
        boolean requireProposalApproval,
        boolean allowMemberInvites,
        String fiscalYearStart
    ) {
    }

    public record SearchResultDto(UUID id, String type, String title, String description, String status) {
    }

    public record ApiErrorDto(Instant timestamp, int status, String code, String message, String path) {
    }

    public record PublicEventDto(UUID id, String title, LocalDate date, String description, String category) {}

    public record CreatePublicEventRequest(@NotBlank String title, @NotNull LocalDate date, @NotBlank String description, @NotBlank String category) {}

    public record PhotoDto(UUID id, String title, LocalDate date, String description) {}

    public record CreatePhotoRequest(@NotBlank String title, @NotNull LocalDate date, @NotBlank String description) {}

    public record CreateEventRequest(@NotBlank String title, @NotNull Instant startsAt, Instant endsAt) {}

    public record UpdateEventRequest(@NotBlank String title, @NotBlank String status, @NotNull Instant startsAt, Instant endsAt, @Min(0) @Max(100) int progress) {}

    public record UpdateProposalRequest(@NotBlank String status) {}

    public record CreateVolunteerSlotRequest(@NotBlank String title, @NotBlank String eventName, @NotNull Instant startsAt, @Min(1) int capacity, @Min(1) int hours) {}

    public record UpdateVolunteerSlotRequest(Integer capacity, Integer filled) {}

    public record CreateThreadRequest(@NotBlank String title, @NotBlank String context, List<String> participants, @NotBlank String body) {}

    public record CreateFinanceTransactionRequest(@NotBlank String title, @NotBlank String category, @NotNull @DecimalMin("0.01") BigDecimal amount) {}

    public record CreateMessageRequest(@NotBlank String body) {}

    public record CreateWorkspaceFileRequest(@NotBlank String name, @NotBlank String fileType, @NotBlank String linkedResource, @NotBlank String sizeLabel) {}

    public record UpdateMemberRequest(@NotBlank String position, @NotBlank String accessLabel) {}

    public record UpdateSettingsRequest(String defaultVisibility, Boolean requireProposalApproval, Boolean allowMemberInvites) {}
}
