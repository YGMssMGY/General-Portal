package com.orgflow.portal.controller;

import com.orgflow.portal.dto.Dtos.MessageThreadDto;
import com.orgflow.portal.service.MessageService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
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
    public List<MessageThreadDto> listThreads() {
        return messageService.listThreads();
    }
}
