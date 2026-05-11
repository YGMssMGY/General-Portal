package com.generalportal.portal.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.generalportal.portal.dto.Dtos.CreateTaskRequest;
import com.generalportal.portal.entity.TaskItem;
import com.generalportal.portal.entity.Workspace;
import com.generalportal.portal.repository.TaskRepository;
import com.generalportal.portal.security.Permissions;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

@ExtendWith(MockitoExtension.class)
class TaskServiceTest {
    @Mock
    private CurrentUserService currentUserService;

    @Mock
    private PermissionService permissionService;

    @Mock
    private TaskRepository taskRepository;

    @InjectMocks
    private TaskService taskService;

    @Test
    @SuppressWarnings("null")
    void listTasksRequiresReadPermissionAndMapsDtos() {
        Workspace workspace = new Workspace("General Portal Workspace", "Student Council Workspace");
        TaskItem task = new TaskItem(workspace, "Confirm gym reservation", "todo", "high", "Winter Formal", LocalDate.now(), "Maya Chen", 0, null);
        var pageable = PageRequest.of(0, 25);
        when(currentUserService.currentWorkspace()).thenReturn(workspace);
        when(taskRepository.findByWorkspace(workspace, pageable)).thenReturn(new PageImpl<>(List.of(task)));

        var result = taskService.listTasks(pageable);

        verify(permissionService).require(Permissions.TASKS_READ);
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).title()).isEqualTo("Confirm gym reservation");
    }

    @Test
    @SuppressWarnings("null")
    void createTaskRequiresWritePermissionAndDefaultsStatus() {
        Workspace workspace = new Workspace("General Portal Workspace", "Student Council Workspace");
        CreateTaskRequest request = new CreateTaskRequest("Draft agenda", "high", "Assembly", LocalDate.now().plusDays(1), "Chris Rivera");
        when(currentUserService.currentWorkspace()).thenReturn(workspace);
        when(taskRepository.save(any(TaskItem.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var result = taskService.createTask(request);

        ArgumentCaptor<TaskItem> taskCaptor = ArgumentCaptor.forClass(TaskItem.class);
        verify(permissionService).require(Permissions.TASKS_WRITE);
        verify(taskRepository).save(taskCaptor.capture());
        assertThat(taskCaptor.getValue().getStatus()).isEqualTo("todo");
        assertThat(result.title()).isEqualTo("Draft agenda");
    }
}
