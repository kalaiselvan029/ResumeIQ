
package com.resumereviewer.backend.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "resume_matches")
public class ResumeMatch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long matchId;

    @ManyToOne
    @JoinColumn(name = "resume_id", nullable = false)
    private Resume resume;

    @Column(nullable = false)
    private double matchPercentage;

    @Column(columnDefinition = "TEXT")
    private String matchedSkills;

    @Column(columnDefinition = "TEXT")
    private String missingSkills;
    @Column(columnDefinition = "TEXT")
    private String resumeSkills;

    @Column(columnDefinition = "TEXT")
    private String jobSkills;

    private LocalDateTime matchedAt;

    public ResumeMatch() {
    }

    @PrePersist
    public void setMatchedAt() {
        this.matchedAt = LocalDateTime.now();
    }

    public Long getMatchId() {
        return matchId;
    }

    public Resume getResume() {
        return resume;
    }

    public void setResume(Resume resume) {
        this.resume = resume;
    }

    public double getMatchPercentage() {
        return matchPercentage;
    }

    public void setMatchPercentage(double matchPercentage) {
        this.matchPercentage = matchPercentage;
    }

    public String getMatchedSkills() {
        return matchedSkills;
    }

    public void setMatchedSkills(String matchedSkills) {
        this.matchedSkills = matchedSkills;
    }

    public String getMissingSkills() {
        return missingSkills;
    }

    public String getResumeSkills() {
        return resumeSkills;
    }

    public void setResumeSkills(String resumeSkills) {
        this.resumeSkills = resumeSkills;
    }

    public String getJobSkills() {
        return jobSkills;
    }

    public void setJobSkills(String jobSkills) {
        this.jobSkills = jobSkills;
    }

    public void setMissingSkills(String missingSkills) {
        this.missingSkills = missingSkills;
    }

    public LocalDateTime getMatchedAt() {
        return matchedAt;
    }
}
