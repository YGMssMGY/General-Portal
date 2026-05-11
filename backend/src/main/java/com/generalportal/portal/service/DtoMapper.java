package com.generalportal.portal.service;

import com.generalportal.portal.dto.Dtos.ActivityDto;
import com.generalportal.portal.dto.Dtos.EventDto;
import com.generalportal.portal.dto.Dtos.FinanceTransactionDto;
import com.generalportal.portal.dto.Dtos.MemberDto;
import com.generalportal.portal.dto.Dtos.MessageDto;
import com.generalportal.portal.dto.Dtos.MessageThreadDto;
import com.generalportal.portal.dto.Dtos.ProposalDto;
import com.generalportal.portal.dto.Dtos.TaskDto;
import com.generalportal.portal.dto.Dtos.VolunteerSlotDto;
import com.generalportal.portal.dto.Dtos.WorkspaceFileDto;
import com.generalportal.portal.dto.Dtos.WorkspaceSettingsDto;
import com.generalportal.portal.entity.ActivityLog;
import com.generalportal.portal.entity.EventItem;
import com.generalportal.portal.entity.EventOwner;
import com.generalportal.portal.entity.FinanceTransaction;
import com.generalportal.portal.entity.Membership;
import com.generalportal.portal.entity.Message;
import com.generalportal.portal.entity.MessageParticipant;
import com.generalportal.portal.entity.MessageThread;
import com.generalportal.portal.entity.Proposal;
import com.generalportal.portal.entity.TaskItem;
import com.generalportal.portal.entity.VolunteerSlot;
import com.generalportal.portal.entity.WorkspaceFile;
import com.generalportal.portal.entity.WorkspaceSettings;
import java.util.List;

final class DtoMapper {
    private DtoMapper() {
    }

    static TaskDto toTaskDto(TaskItem task) {
        return new TaskDto(
            task.getId(),
            task.getTitle(),
            task.getStatus(),
            task.getPriority(),
            task.getProject(),
            task.getDueDate(),
            task.getAssigneeName(),
            task.getProgress(),
            task.getBlockedReason()
        );
    }

    static ProposalDto toProposalDto(Proposal proposal) {
        return new ProposalDto(
            proposal.getId(),
            proposal.getTitle(),
            proposal.getType(),
            proposal.getStatus(),
            proposal.getSubmittedBy(),
            proposal.getSubmittedAt(),
            proposal.getBudget(),
            proposal.getSummary()
        );
    }

    static EventDto toEventDto(EventItem event) {
        List<String> owners = event.getOwners().stream().map(EventOwner::getOwnerLabel).toList();
        return new EventDto(
            event.getId(),
            event.getTitle(),
            event.getStatus(),
            event.getStartsAt(),
            event.getEndsAt(),
            event.getProgress(),
            event.getBudgetUsed(),
            event.getBudgetTotal(),
            owners
        );
    }

    static VolunteerSlotDto toVolunteerSlotDto(VolunteerSlot slot) {
        return new VolunteerSlotDto(slot.getId(), slot.getTitle(), slot.getEventName(), slot.getStartsAt(), slot.getCapacity(), slot.getFilled(), slot.getHours());
    }

    static FinanceTransactionDto toFinanceTransactionDto(FinanceTransaction transaction) {
        return new FinanceTransactionDto(
            transaction.getId(),
            transaction.getTitle(),
            transaction.getCategory(),
            transaction.getStatus(),
            transaction.getSubmittedBy(),
            transaction.getAmount(),
            transaction.getOccurredAt()
        );
    }

    static MessageThreadDto toMessageThreadDto(MessageThread thread) {
        List<String> participants = thread.getParticipants().stream().map(MessageParticipant::getName).toList();
        List<MessageDto> messages = thread.getMessages().stream().map(DtoMapper::toMessageDto).toList();
        return new MessageThreadDto(
            thread.getId(),
            thread.getTitle(),
            thread.getContext(),
            thread.getStatus(),
            thread.getPreview(),
            thread.getUnreadCount(),
            thread.getLastMessageAt(),
            participants,
            messages
        );
    }

    static MessageDto toMessageDto(Message message) {
        return new MessageDto(message.getId(), message.getAuthorName(), message.getBody(), message.getSentAt());
    }

    static WorkspaceFileDto toWorkspaceFileDto(WorkspaceFile file) {
        return new WorkspaceFileDto(
            file.getId(),
            file.getName(),
            file.getFileType(),
            file.getOwnerName(),
            file.getLinkedResource(),
            file.getSizeLabel(),
            file.getFileUpdatedAt()
        );
    }

    static MemberDto toMemberDto(Membership membership, List<String> permissions) {
        return new MemberDto(
            membership.getId(),
            membership.getUser().getDisplayName(),
            membership.getUser().getEmail(),
            membership.getPosition(),
            membership.getAccessLabel(),
            membership.getTaskCount(),
            membership.getVolunteerHours(),
            permissions
        );
    }

    static ActivityDto toActivityDto(ActivityLog activity) {
        return new ActivityDto(activity.getId(), activity.getActorName(), activity.getAction(), activity.getResourceType(), activity.getResourceTitle(), activity.getOccurredAt());
    }

    static WorkspaceSettingsDto toWorkspaceSettingsDto(WorkspaceSettings settings) {
        return new WorkspaceSettingsDto(
            settings.getWorkspaceName(),
            settings.getDefaultVisibility(),
            settings.isRequireProposalApproval(),
            settings.isAllowMemberInvites(),
            settings.getFiscalYearStart()
        );
    }
}
