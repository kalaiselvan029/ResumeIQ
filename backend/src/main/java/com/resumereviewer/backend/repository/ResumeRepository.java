
package com.resumereviewer.backend.repository;

import com.resumereviewer.backend.entity.Resume;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ResumeRepository extends JpaRepository<Resume, Long> {

    List<Resume> findByUserUserId(Long userId);
}
