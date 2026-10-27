
package com.resumereviewer.backend.service;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class SkillMatchingService {

    public Map<String, Object> matchSkills(
            List<String> resumeSkills,
            List<String> jobSkills) {

        List<String> matchedSkills = new ArrayList<>();
        List<String> missingSkills = new ArrayList<>();

        // Normalize resume skills and remove duplicates.
        LinkedHashSet<String> normalizedResumeSkills =
                new LinkedHashSet<>();

        if (resumeSkills != null) {
            for (String skill : resumeSkills) {
                if (skill != null && !skill.isBlank()) {
                    normalizedResumeSkills.add(normalizeSkill(skill));
                }
            }
        }

        // Keep one display name for each unique job skill.
        Map<String, String> uniqueJobSkills = new LinkedHashMap<>();

        if (jobSkills != null) {
            for (String skill : jobSkills) {
                if (skill != null && !skill.isBlank()) {
                    uniqueJobSkills.putIfAbsent(
                            normalizeSkill(skill),
                            skill.trim()
                    );
                }
            }
        }

        // Compare unique job skills against resume skills.
        for (Map.Entry<String, String> entry
                : uniqueJobSkills.entrySet()) {

            String normalizedSkill = entry.getKey();
            String displaySkill = entry.getValue();

            if (normalizedResumeSkills.contains(normalizedSkill)) {
                matchedSkills.add(displaySkill);
            } else {
                missingSkills.add(displaySkill);
            }
        }

        double matchPercentage = 0.0;

        if (!uniqueJobSkills.isEmpty()) {
            matchPercentage =
                    matchedSkills.size() * 100.0
                            / uniqueJobSkills.size();
        }

        return Map.of(
                "matchedSkills", matchedSkills,
                "missingSkills", missingSkills,
                "matchPercentage",
                Math.round(matchPercentage * 100.0) / 100.0
        );
    }

    private String normalizeSkill(String skill) {

        String normalized = skill
                .trim()
                .toLowerCase(Locale.ROOT)
                .replaceAll("\\s+", " ");

        // REST API and REST APIs represent the same skill.
        if (normalized.equals("rest api")
                || normalized.equals("rest apis")) {
            return "rest api";
        }

        return normalized;
    }
}
