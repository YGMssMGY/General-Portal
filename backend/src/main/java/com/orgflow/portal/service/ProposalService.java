package com.orgflow.portal.service;

import com.orgflow.portal.dto.Dtos.CreateProposalRequest;
import com.orgflow.portal.dto.Dtos.ProposalDto;
import com.orgflow.portal.dto.Dtos.UpdateProposalRequest;
import com.orgflow.portal.entity.Proposal;
import com.orgflow.portal.exception.ResourceNotFoundException;
import com.orgflow.portal.repository.ProposalRepository;
import com.orgflow.portal.security.Permissions;
import java.time.Instant;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProposalService {
    private final CurrentUserService currentUserService;
    private final PermissionService permissionService;
    private final ProposalRepository proposalRepository;

    public ProposalService(CurrentUserService currentUserService, PermissionService permissionService, ProposalRepository proposalRepository) {
        this.currentUserService = currentUserService;
        this.permissionService = permissionService;
        this.proposalRepository = proposalRepository;
    }

    @Transactional(readOnly = true)
    public Page<ProposalDto> listProposals(Pageable pageable) {
        permissionService.require(Permissions.PROPOSALS_READ);
        return proposalRepository.findByWorkspace(currentUserService.currentWorkspace(), pageable)
            .map(DtoMapper::toProposalDto);
    }

    @Transactional
    public ProposalDto createProposal(CreateProposalRequest request) {
        permissionService.require(Permissions.PROPOSALS_WRITE);
        var proposal = new Proposal(currentUserService.currentWorkspace(), request.title(), request.type(), "pending", request.submittedBy(), Instant.now(), request.budget(), request.summary());
        return DtoMapper.toProposalDto(proposalRepository.save(proposal));
    }

    @Transactional
    public ProposalDto updateProposal(UUID id, UpdateProposalRequest request) {
        permissionService.require(Permissions.PROPOSALS_WRITE);
        Proposal proposal = proposalRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Proposal"));
        proposal.setStatus(request.status());
        return DtoMapper.toProposalDto(proposal);
    }
}
