package com.generalportal.portal.controller;

import com.generalportal.portal.dto.Dtos.CreateMessageRequest;
import com.generalportal.portal.dto.Dtos.MessageThreadDto;
import com.generalportal.portal.service.MessageService;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.Objects;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
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

    @PostMapping("/threads/{threadId}/messages")
    @PreAuthorize("hasAuthority('messages:write')")
    public ResponseEntity<MessageThreadDto> sendMessage(@PathVariable UUID threadId, @Valid @RequestBody CreateMessageRequest request) {
        MessageThreadDto thread = messageService.sendMessage(threadId, request.body());
        return ResponseEntity.created(Objects.requireNonNull(URI.create("/api/messages/threads/" + threadId))).body(thread);
    }
}
