package com.generalportal.portal.config;

import com.generalportal.portal.entity.ActivityLog;
import com.generalportal.portal.entity.EventItem;
import com.generalportal.portal.entity.FinanceTransaction;
import com.generalportal.portal.entity.Membership;
import com.generalportal.portal.entity.MessageThread;
import com.generalportal.portal.entity.PermissionGrant;
import com.generalportal.portal.entity.Photo;
import com.generalportal.portal.entity.Proposal;
import com.generalportal.portal.entity.PublicEvent;
import com.generalportal.portal.entity.TaskItem;
import com.generalportal.portal.entity.UserAccount;
import com.generalportal.portal.entity.VolunteerSlot;
import com.generalportal.portal.entity.Workspace;
import com.generalportal.portal.entity.WorkspaceFile;
import com.generalportal.portal.entity.WorkspaceSettings;
import com.generalportal.portal.repository.ActivityLogRepository;
import com.generalportal.portal.repository.EventRepository;
import com.generalportal.portal.repository.FinanceTransactionRepository;
import com.generalportal.portal.repository.MembershipRepository;
import com.generalportal.portal.repository.MessageThreadRepository;
import com.generalportal.portal.repository.PermissionGrantRepository;
import com.generalportal.portal.repository.PhotoRepository;
import com.generalportal.portal.repository.ProposalRepository;
import com.generalportal.portal.repository.PublicEventRepository;
import com.generalportal.portal.repository.TaskRepository;
import com.generalportal.portal.repository.UserAccountRepository;
import com.generalportal.portal.repository.VolunteerSlotRepository;
import com.generalportal.portal.repository.WorkspaceFileRepository;
import com.generalportal.portal.repository.WorkspaceRepository;
import com.generalportal.portal.repository.WorkspaceSettingsRepository;
import com.generalportal.portal.security.Permissions;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.annotation.Transactional;

@Configuration
@ConditionalOnProperty(name = "general-portal.seed.enabled", havingValue = "true")
public class DataSeeder {
    @Bean
    CommandLineRunner seedData(Seeder seeder) {
        return args -> seeder.seed();
    }

    @Configuration
    static class Seeder {
        private final WorkspaceRepository workspaceRepository;
        private final UserAccountRepository userAccountRepository;
        private final MembershipRepository membershipRepository;
        private final PermissionGrantRepository permissionGrantRepository;
        private final TaskRepository taskRepository;
        private final ProposalRepository proposalRepository;
        private final EventRepository eventRepository;
        private final VolunteerSlotRepository volunteerSlotRepository;
        private final FinanceTransactionRepository financeTransactionRepository;
        private final MessageThreadRepository messageThreadRepository;
        private final WorkspaceFileRepository workspaceFileRepository;
        private final ActivityLogRepository activityLogRepository;
        private final WorkspaceSettingsRepository workspaceSettingsRepository;
        private final PublicEventRepository publicEventRepository;
        private final PhotoRepository photoRepository;

        Seeder(
            WorkspaceRepository workspaceRepository,
            UserAccountRepository userAccountRepository,
            MembershipRepository membershipRepository,
            PermissionGrantRepository permissionGrantRepository,
            TaskRepository taskRepository,
            ProposalRepository proposalRepository,
            EventRepository eventRepository,
            VolunteerSlotRepository volunteerSlotRepository,
            FinanceTransactionRepository financeTransactionRepository,
            MessageThreadRepository messageThreadRepository,
            WorkspaceFileRepository workspaceFileRepository,
            ActivityLogRepository activityLogRepository,
            WorkspaceSettingsRepository workspaceSettingsRepository,
            PublicEventRepository publicEventRepository,
            PhotoRepository photoRepository
        ) {
            this.workspaceRepository = workspaceRepository;
            this.userAccountRepository = userAccountRepository;
            this.membershipRepository = membershipRepository;
            this.permissionGrantRepository = permissionGrantRepository;
            this.taskRepository = taskRepository;
            this.proposalRepository = proposalRepository;
            this.eventRepository = eventRepository;
            this.volunteerSlotRepository = volunteerSlotRepository;
            this.financeTransactionRepository = financeTransactionRepository;
            this.messageThreadRepository = messageThreadRepository;
            this.workspaceFileRepository = workspaceFileRepository;
            this.activityLogRepository = activityLogRepository;
            this.workspaceSettingsRepository = workspaceSettingsRepository;
            this.publicEventRepository = publicEventRepository;
            this.photoRepository = photoRepository;
        }

        @Transactional
        void seed() {
            if (workspaceRepository.findByName("General Portal Workspace").isPresent()) {
                return;
            }

            Workspace workspace = workspaceRepository.save(new Workspace("General Portal Workspace", "Student Council Workspace"));
            UserAccount chris = userAccountRepository.save(new UserAccount("chris@example.edu", "Chris Rivera", null));
            UserAccount sarah = userAccountRepository.save(new UserAccount("sarah.j@example.edu", "Sarah Jenkins", null));
            UserAccount maya = userAccountRepository.save(new UserAccount("maya.c@example.edu", "Maya Chen", null));
            UserAccount jordan = userAccountRepository.save(new UserAccount("jordan.d@example.edu", "Jordan Diaz", null));
            UserAccount devAdmin = userAccountRepository.save(new UserAccount("dev@generalportal.local", "Dev Admin", null));

            Membership chrisMembership = membershipRepository.save(new Membership(workspace, chris, "Admin", "Admin", 4, 88));
            Membership sarahMembership = membershipRepository.save(new Membership(workspace, sarah, "President", "President", 5, 120));
            Membership mayaMembership = membershipRepository.save(new Membership(workspace, maya, "Officer", "Officer", 3, 96));
            Membership jordanMembership = membershipRepository.save(new Membership(workspace, jordan, "Member", "Member", 7, 142));
            Membership devMembership = membershipRepository.save(new Membership(workspace, devAdmin, "Admin", "Admin", 0, 0));

            Permissions.adminPermissions().forEach(permission -> permissionGrantRepository.save(new PermissionGrant(chrisMembership, permission)));
            Permissions.presidentPermissions().forEach(permission -> permissionGrantRepository.save(new PermissionGrant(sarahMembership, permission)));
            Permissions.officerPermissions().forEach(permission -> permissionGrantRepository.save(new PermissionGrant(mayaMembership, permission)));
            Permissions.memberPermissions().forEach(permission -> permissionGrantRepository.save(new PermissionGrant(jordanMembership, permission)));
            Permissions.adminPermissions().forEach(permission -> permissionGrantRepository.save(new PermissionGrant(devMembership, permission)));

            taskRepository.save(new TaskItem(workspace, "Confirm gym reservation", "todo", "high", "Winter Formal", LocalDate.now().plusDays(8), "Maya Chen", 0, null));
            taskRepository.save(new TaskItem(workspace, "Update volunteer contact list", "todo", "low", "General Admin", LocalDate.now().plusDays(12), "Jordan Diaz", 0, null));
            taskRepository.save(new TaskItem(workspace, "Design fundraiser poster", "in_progress", "medium", "Fall Drive", LocalDate.now().plusDays(1), "Chris Rivera", 50, null));
            taskRepository.save(new TaskItem(workspace, "Approve catering budget", "blocked", "high", "Winter Formal", LocalDate.now().minusDays(1), "Sarah Jenkins", 20, "Waiting on Finance Dept"));

            proposalRepository.save(new Proposal(workspace, "Winter Formal Decoration Plan", "Event", "under_review", "Sarah Jenkins", Instant.now().minusSeconds(86400), new BigDecimal("1850.00"), "Decor, lighting, and table styling plan for the winter formal venue."));
            proposalRepository.save(new Proposal(workspace, "Fall Merchandise Design", "Purchase", "submitted", "Maya Chen", Instant.now().minusSeconds(7200), new BigDecimal("940.00"), "Hoodie and sticker set for the fall membership drive."));
            proposalRepository.save(new Proposal(workspace, "Community Garden Workday", "Project", "approved", "Jordan Diaz", Instant.now().minusSeconds(420000), new BigDecimal("420.00"), "Volunteer event for cleanup, planting, and signage updates."));

            EventItem spiritWeek = new EventItem(workspace, "Spirit Week 2026", "active", Instant.now().plusSeconds(1296000), Instant.now().plusSeconds(1641600), 75, new BigDecimal("2500.00"), new BigDecimal("3000.00"));
            spiritWeek.addOwner("JD");
            spiritWeek.addOwner("AL");
            spiritWeek.addOwner("+3");
            eventRepository.save(spiritWeek);

            EventItem formal = new EventItem(workspace, "Winter Formal", "pending", Instant.parse("2026-12-10T19:00:00Z"), null, 30, new BigDecimal("1200.00"), new BigDecimal("6200.00"));
            formal.addOwner("SJ");
            formal.addOwner("MC");
            eventRepository.save(formal);

            volunteerSlotRepository.save(new VolunteerSlot(workspace, "Food Booth Setup", "Spirit Week", Instant.now().plusSeconds(1292400), 10, 8, 4));
            volunteerSlotRepository.save(new VolunteerSlot(workspace, "Check-in Table", "Winter Formal", Instant.parse("2026-12-10T18:00:00Z"), 6, 4, 3));

            financeTransactionRepository.save(new FinanceTransaction(workspace, "Receipt for event posters", "Printing", "pending", "Maya Chen", new BigDecimal("86.25"), Instant.now().minusSeconds(7200)));
            financeTransactionRepository.save(new FinanceTransaction(workspace, "Venue deposit", "Event", "approved", "Sarah Jenkins", new BigDecimal("500.00"), Instant.now().minusSeconds(260000)));
            financeTransactionRepository.save(new FinanceTransaction(workspace, "Catering quote", "Food", "under_review", "Chris Rivera", new BigDecimal("1280.00"), Instant.now().minusSeconds(160000)));

            MessageThread thread = new MessageThread(workspace, "Winter Formal Planning", "event", "active", "Sarah: I updated the seating chart for the VIP section.", 2, Instant.now().minusSeconds(3600));
            thread.addParticipant("Sarah");
            thread.addParticipant("Maya");
            thread.addParticipant("Chris");
            thread.addMessage("Sarah", "I updated the seating chart for the VIP section.", Instant.now().minusSeconds(3600));
            thread.addMessage("Chris", "Great, please attach it to the event file list too.", Instant.now().minusSeconds(3300));
            messageThreadRepository.save(thread);

            MessageThread resolvedThread = new MessageThread(workspace, "Confirm Decorations Task", "task", "completed", "Mark: All balloons and banners ordered.", 0, Instant.now().minusSeconds(90000));
            resolvedThread.addParticipant("Mark");
            resolvedThread.addParticipant("Chris");
            messageThreadRepository.save(resolvedThread);

            workspaceFileRepository.save(new WorkspaceFile(workspace, "Winter Formal Budget.xlsx", "Spreadsheet", "Sarah Jenkins", "Winter Formal", "84 KB", "files/winter-formal-budget", Instant.now().minusSeconds(1800)));
            workspaceFileRepository.save(new WorkspaceFile(workspace, "Volunteer Roster.pdf", "PDF", "Jordan Diaz", "Volunteer Program", "1.2 MB", "files/volunteer-roster", Instant.now().minusSeconds(180000)));

            activityLogRepository.save(new ActivityLog(workspace, "Maya Chen", "uploaded a receipt", "Finance", "Event posters", Instant.now().minusSeconds(7200)));
            activityLogRepository.save(new ActivityLog(workspace, "Chris Rivera", "approved proposal", "Proposal", "#142", Instant.now().minusSeconds(18000)));
            activityLogRepository.save(new ActivityLog(workspace, "Sarah Jenkins", "created an event", "Event", "Spirit Week 2026", Instant.now().minusSeconds(96000)));

            workspaceSettingsRepository.save(new WorkspaceSettings(workspace, "members", true, false, "August"));

            publicEventRepository.save(new PublicEvent(workspace, "Annual Hackathon 2025", LocalDate.of(2025, 11, 15), "Our flagship event brought together over 200 participants for a weekend of innovation and collaboration.", "Competition"));
            publicEventRepository.save(new PublicEvent(workspace, "Spring Coding Workshop", LocalDate.of(2025, 4, 10), "Hands-on sessions covering web development, Python, and introductory programming.", "Workshop"));
            publicEventRepository.save(new PublicEvent(workspace, "Leadership Summit", LocalDate.of(2025, 9, 22), "An inspiring gathering of students, mentors, and industry professionals.", "Conference"));
            publicEventRepository.save(new PublicEvent(workspace, "Community Tech Fair", LocalDate.of(2025, 6, 5), "Students showcased projects to parents, teachers, and local tech companies.", "Community"));
            publicEventRepository.save(new PublicEvent(workspace, "Robotics Competition", LocalDate.of(2025, 3, 18), "Teams competed in autonomous and driver-controlled challenges.", "Competition"));
            publicEventRepository.save(new PublicEvent(workspace, "Alumni Networking Night", LocalDate.of(2025, 12, 1), "Former club members returned to share career advice.", "Social"));

            photoRepository.save(new Photo(workspace, "Group Photo", LocalDate.of(2025, 11, 15), "Participants at the Annual Hackathon."));
            photoRepository.save(new Photo(workspace, "Workshop Session", LocalDate.of(2025, 4, 10), "Students engaged in hands-on coding."));
            photoRepository.save(new Photo(workspace, "Award Ceremony", LocalDate.of(2025, 9, 22), "Award recipients at the Leadership Summit."));
            photoRepository.save(new Photo(workspace, "Team Building", LocalDate.of(2025, 6, 5), "Team activities at the Community Tech Fair."));
            photoRepository.save(new Photo(workspace, "Presentations", LocalDate.of(2025, 3, 18), "Teams presenting their robotics projects."));
            photoRepository.save(new Photo(workspace, "Panel Discussion", LocalDate.of(2025, 12, 1), "Alumni panel sharing career insights."));
        }
    }
}
