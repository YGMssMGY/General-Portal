package com.orgflow.portal.controller;

import com.orgflow.portal.dto.Dtos.CreatePhotoRequest;
import com.orgflow.portal.dto.Dtos.PhotoDto;
import com.orgflow.portal.service.PhotoService;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.Objects;
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
@RequestMapping("/api/photos")
public class PhotoController {
    private final PhotoService service;

    public PhotoController(PhotoService service) {
        this.service = service;
    }

    @GetMapping
    public Page<PhotoDto> listPhotos(@PageableDefault(size = 25) Pageable pageable) {
        return service.listPhotos(pageable);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('files:write')")
    public ResponseEntity<PhotoDto> create(@Valid @RequestBody CreatePhotoRequest request) {
        PhotoDto dto = service.create(request);
        return ResponseEntity.created(Objects.requireNonNull(URI.create("/api/photos/" + dto.id()))).body(dto);
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAuthority('files:write')")
    public PhotoDto update(@PathVariable UUID id, @Valid @RequestBody CreatePhotoRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('files:write')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
