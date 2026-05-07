package com.orgflow.portal.controller;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/photos")
public class PhotoController {
    public record Photo(String id, String title, String date, String description) {}

    @GetMapping
    public List<Photo> listPhotos() {
        return List.of(
            new Photo("photo-1", "Group Photo", "2025-11-15", "Participants at the Annual Hackathon group photo."),
            new Photo("photo-2", "Workshop Session", "2025-04-10", "Students engaged in hands-on coding during the Spring Workshop."),
            new Photo("photo-3", "Award Ceremony", "2025-09-22", "Award recipients at the Leadership Summit closing ceremony."),
            new Photo("photo-4", "Team Building", "2025-06-05", "Team building activities at the Community Tech Fair."),
            new Photo("photo-5", "Presentations", "2025-03-18", "Teams presenting their robotics projects to judges."),
            new Photo("photo-6", "Panel Discussion", "2025-12-01", "Alumni panel sharing career insights with current members."),
            new Photo("photo-7", "Hands-on Lab", "2025-07-14", "Participants working on open source contributions."),
            new Photo("photo-8", "Closing Remarks", "2025-02-28", "Winners of the Game Jam receiving their prizes."),
            new Photo("photo-9", "Networking Hour", "2025-05-20", "Students networking with industry professionals."),
            new Photo("photo-10", "Project Showcase", "2025-10-08", "Students demonstrating their science projects."),
            new Photo("photo-11", "Cultural Performance", "2025-01-25", "Dance performance at the Cultural Festival."),
            new Photo("photo-12", "Certificate Ceremony", "2025-12-18", "Members receiving certificates at the End-of-Year Celebration.")
        );
    }
}
