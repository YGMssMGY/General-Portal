package com.orgflow.portal.service;

import com.orgflow.portal.dto.Dtos.ActivityDto;
import com.orgflow.portal.dto.Dtos.EventDto;
import com.orgflow.portal.dto.Dtos.FinanceTransactionDto;
import com.orgflow.portal.dto.Dtos.MemberDto;
import com.orgflow.portal.dto.Dtos.MessageDto;
import com.orgflow.portal.dto.Dtos.MessageThreadDto;
import com.orgflow.portal.dto.Dtos.ProposalDto;
import com.orgflow.portal.dto.Dtos.TaskDto;
import com.orgflow.portal.dto.Dtos.VolunteerSlotDto;
import com.orgflow.portal.dto.Dtos.WorkspaceFileDto;
import com.orgflow.portal.dto.Dtos.WorkspaceSettingsDto;
import com.orgflow.portal.entity.ActivityLog;
import com.orgflow.portal.entity.EventItem;
import com.orgflow.portal.entity.EventOwner;
import com.orgflow.portal.entity.FinanceTransaction;
import com.orgflow.portal.entity.Membership;
import com.orgflow.portal.entity.Message;
import com.orgflow.portal.entity.MessageParticipant;
import com.orgflow.portal.entity.MessageThread;
import com.orgflow.portal.entity.Proposal;
import com.orgflow.portal.entity.TaskItem;
import com.orgflow.portal.entity.VolunteerSlot;
import com.orgflow.portal.entity.WorkspaceFile;
import com.orgflow.portal.entity.WorkspaceSettings;
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
