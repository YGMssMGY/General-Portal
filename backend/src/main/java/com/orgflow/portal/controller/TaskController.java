package com.orgflow.portal.controller;

import com.orgflow.portal.dto.Dtos.CreateTaskRequest;
import com.orgflow.portal.dto.Dtos.TaskDto;
import com.orgflow.portal.dto.Dtos.UpdateTaskRequest;
import com.orgflow.portal.service.TaskService;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {
    private final TaskService taskService;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('tasks:read')")
    public Page<TaskDto> listTasks(@PageableDefault(size = 25) Pageable pageable) {
        return taskService.listTasks(pageable);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('tasks:write')")
    public ResponseEntity<TaskDto> createTask(@Valid @RequestBody CreateTaskRequest request) {
        TaskDto task = taskService.createTask(request);
        return ResponseEntity.created(URI.create("/api/tasks/" + task.id())).body(task);
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAuthority('tasks:write')")
    public TaskDto updateTask(@PathVariable UUID id, @Valid @RequestBody UpdateTaskRequest request) {
        return taskService.updateTask(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('tasks:write')")
    public ResponseEntity<Void> deleteTask(@PathVariable UUID id) {
        taskService.deleteTask(id);
        return ResponseEntity.noContent().build();
    }
}
