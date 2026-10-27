
package com.resumereviewer.backend.service;

import org.springframework.stereotype.Service;

import java.util.Locale;
import java.util.regex.Pattern;

@Service
public class ResumeContentValidationService {

    private static final String[] RESUME_SECTIONS = {
            "education",
            "work experience",
            "professional experience",
            "employment history",
            "technical skills",
            "skills",
            "projects",
            "certifications",
            "internship",
            "internships"
    };

    private static final Pattern EMAIL_PATTERN =
            Pattern.compile(
                    "\\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}\\b",
                    Pattern.CASE_INSENSITIVE
            );

    public boolean isLikelyResume(String text) {

        if (text == null || text.isBlank()) {
            return false;
        }

        String normalizedText = text.toLowerCase(Locale.ROOT);

        int sectionCount = 0;

        for (String section : RESUME_SECTIONS) {
            if (normalizedText.contains(section)) {
                sectionCount++;
            }
        }

        boolean hasEmail =
                EMAIL_PATTERN.matcher(text).find();

        // Require contact information and multiple resume sections.
        return hasEmail && sectionCount >= 2;
    }
}
