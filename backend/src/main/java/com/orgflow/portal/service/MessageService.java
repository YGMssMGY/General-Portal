package com.orgflow.portal.service;

import com.orgflow.portal.dto.Dtos.MessageThreadDto;
import com.orgflow.portal.repository.MessageThreadRepository;
import com.orgflow.portal.security.Permissions;
import java.util.List;
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
    public List<MessageThreadDto> listThreads() {
        permissionService.require(Permissions.MESSAGES_READ);
        return messageThreadRepository.findByWorkspaceOrderByLastMessageAtDesc(currentUserService.currentWorkspace()).stream()
            .map(DtoMapper::toMessageThreadDto)
            .toList();
    }
}
