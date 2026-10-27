
package com.resumereviewer.backend.service;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

@Service
public class SkillExtractionService {

    private final List<String> skills = List.of(
            // Programming languages
            "JavaScript",
            "TypeScript",
            "Java",
            "Python",
            "C++",
            "C#",
            "C",

            // Frontend
            "React",
            "Next.js",
            "HTML",
            "CSS",
            "Tailwind CSS",
            "Bootstrap",
            "Redux",
            "Vite",
            "Angular",
            "Vue.js",

            // Backend
            "Spring Boot",
            "Spring Security",
            "Spring Data JPA",
            "Hibernate",
            "Node.js",
            "Express.js",
            "REST API",
            "REST APIs",
            "Microservices",
            "JWT",
            "Servlets",
            "JDBC",

            // Databases
            "MySQL",
            "SQL",
            "MongoDB",
            "PostgreSQL",
            "Oracle",
            "Redis",

            // Tools and platforms
            "Git",
            "GitHub",
            "Docker",
            "Kubernetes",
            "AWS",
            "Azure",
            "Linux",
            "Maven",
            "Postman",

            // Testing and development
            "JUnit",
            "Mockito",
            "Selenium",
            "Unit Testing",
            "Integration Testing",
            "CI/CD",
            "Agile",
            "Data Structures",
            "Algorithms"
    );

    public List<String> extractSkills(String text) {

        List<String> extractedSkills = new ArrayList<>();

        if (text == null || text.isBlank()) {
            return extractedSkills;
        }

        String normalizedText = text.toLowerCase(Locale.ROOT);

        for (String skill : skills) {

            String regex = "(?i)(?<![a-z0-9])"
                    + Pattern.quote(skill)
                    + "(?![a-z0-9])";

            if (Pattern.compile(regex).matcher(normalizedText).find()) {
                extractedSkills.add(skill);
            }
        }

        return extractedSkills;
    }
}
