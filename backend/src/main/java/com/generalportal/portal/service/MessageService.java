package com.orgflow.portal.service;

import com.orgflow.portal.dto.Dtos.MessageThreadDto;
import com.orgflow.portal.entity.MessageThread;
import com.orgflow.portal.exception.ResourceNotFoundException;
import com.orgflow.portal.repository.MessageThreadRepository;
import com.orgflow.portal.security.Permissions;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MessageService {
    private final CurrentUserService currentUserService;
    private final PermissionService permissionService;
    private final MessageThreadRepository messageThreadRepository;

    public MessageService(CurrentUserService currentUserService, PermissionService permissionService, MessageThreadRepository messageThreadRepository) {
        this.currentUserService = currentUserService;
        this.permissionService = permissionService;
        this.messageThreadRepository = messageThreadRepository;
    }

    @Transactional(readOnly = true)
    public Page<MessageThreadDto> listThreads(Pageable pageable) {
        permissionService.require(Permissions.MESSAGES_READ);
        return messageThreadRepository.findByWorkspace(currentUserService.currentWorkspace(), pageable)
            .map(DtoMapper::toMessageThreadDto);
    }

    @Transactional(readOnly = true)
    public MessageThreadDto getThread(UUID threadId) {
        permissionService.require(Permissions.MESSAGES_READ);
        return messageThreadRepository.findById(Objects.requireNonNull(threadId))
            .map(DtoMapper::toMessageThreadDto)
            .orElseThrow(() -> new ResourceNotFoundException("MessageThread " + threadId));
    }

    @Transactional
    public MessageThreadDto sendMessage(UUID threadId, String body) {
        permissionService.require(Permissions.MESSAGES_WRITE);
        MessageThread thread = messageThreadRepository.findById(Objects.requireNonNull(threadId))
            .orElseThrow(() -> new ResourceNotFoundException("MessageThread " + threadId));
        String authorName = currentUserService.currentUser().getDisplayName();
        thread.addMessage(authorName, body, Instant.now());
        thread.setPreview(body.length() > 80 ? body.substring(0, 80) + "..." : body);
        thread.setLastMessageAt(Instant.now());
        return DtoMapper.toMessageThreadDto(thread);
    }
}
