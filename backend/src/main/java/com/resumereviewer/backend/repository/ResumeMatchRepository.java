
package com.resumereviewer.backend.repository;

import com.resumereviewer.backend.entity.ResumeMatch;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;

public interface ResumeMatchRepository
        extends JpaRepository<ResumeMatch, Long> {

    List<ResumeMatch> findByResumeResumeId(Long resumeId);
    Optional<ResumeMatch> findByMatchId(Long matchId);
}
