package com.orgflow.portal.controller;

import com.orgflow.portal.dto.Dtos.MessageThreadDto;
import com.orgflow.portal.service.MessageService;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/messages")
public class MessageController {
    private final MessageService messageService;

    public MessageController(MessageService messageService) {
        this.messageService = messageService;
    }

    @GetMapping("/threads")
    @PreAuthorize("hasAuthority('messages:read')")
    public Page<MessageThreadDto> listThreads(@PageableDefault(size = 25) Pageable pageable) {
        return messageService.listThreads(pageable);
    }

    @GetMapping("/threads/{threadId}")
    @PreAuthorize("hasAuthority('messages:read')")
    public MessageThreadDto getThread(@PathVariable UUID threadId) {
        return messageService.getThread(threadId);
    }
}
