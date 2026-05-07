package com.orgflow.portal.service;

import com.orgflow.portal.dto.Dtos.TaskDto;
import com.orgflow.portal.dto.Dtos.CreateTaskRequest;
import com.orgflow.portal.dto.Dtos.UpdateTaskRequest;
import com.orgflow.portal.entity.TaskItem;
import com.orgflow.portal.exception.ResourceNotFoundException;
import com.orgflow.portal.repository.TaskRepository;
import com.orgflow.portal.security.Permissions;
import java.util.Objects;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TaskService {
    private final CurrentUserService currentUserService;
    private final PermissionService permissionService;
    private final TaskRepository taskRepository;

    public TaskService(CurrentUserService currentUserService, PermissionService permissionService, TaskRepository taskRepository) {
        this.currentUserService = currentUserService;
        this.permissionService = permissionService;
        this.taskRepository = taskRepository;
    }

    @Transactional(readOnly = true)
    public Page<TaskDto> listTasks(Pageable pageable) {
        permissionService.require(Permissions.TASKS_READ);
        var workspace = currentUserService.currentWorkspace();
        return taskRepository.findByWorkspace(workspace, pageable)
            .map(DtoMapper::toTaskDto);
    }

    @Transactional
    public TaskDto createTask(CreateTaskRequest request) {
        permissionService.require(Permissions.TASKS_WRITE);
        var task = new TaskItem(
            currentUserService.currentWorkspace(),
            request.title(),
            "todo",
            request.priority(),
            request.project(),
            request.dueDate(),
            request.assigneeName(),
            0,
            null
        );
        return DtoMapper.toTaskDto(taskRepository.save(task));
    }

    @Transactional
    public TaskDto updateTask(UUID id, UpdateTaskRequest request) {
        permissionService.require(Permissions.TASKS_WRITE);
        TaskItem task = getTaskInCurrentWorkspace(id);
        task.update(
            request.title(),
            request.status(),
            request.priority(),
            request.project(),
            request.dueDate(),
            request.assigneeName(),
            request.progress(),
            request.blockedReason()
        );
        return DtoMapper.toTaskDto(task);
    }

    @Transactional
    public void deleteTask(UUID id) {
        permissionService.require(Permissions.TASKS_WRITE);
        taskRepository.delete(Objects.requireNonNull(getTaskInCurrentWorkspace(id)));
    }

    private TaskItem getTaskInCurrentWorkspace(UUID id) {
        var workspace = currentUserService.currentWorkspace();
        TaskItem task = taskRepository.findById(Objects.requireNonNull(id)).orElseThrow(() -> new ResourceNotFoundException("Task"));
        if (!task.getWorkspace().getId().equals(workspace.getId())) {
            throw new ResourceNotFoundException("Task");
        }
        return task;
    }
}
