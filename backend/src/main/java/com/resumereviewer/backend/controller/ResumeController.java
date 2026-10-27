
package com.resumereviewer.backend.controller;

import com.resumereviewer.backend.entity.Resume;
import com.resumereviewer.backend.entity.User;
import com.resumereviewer.backend.repository.ResumeRepository;
import com.resumereviewer.backend.repository.UserRepository;
import com.resumereviewer.backend.service.ResumeContentValidationService;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.*;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import com.resumereviewer.backend.service.ResumeTextExtractionService;
import com.resumereviewer.backend.service.SkillExtractionService;
import java.util.List;
import com.resumereviewer.backend.service.SkillMatchingService;
import com.resumereviewer.backend.entity.ResumeMatch;
import com.resumereviewer.backend.repository.ResumeMatchRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.security.core.context.SecurityContextHolder;

import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@RestController
@RequestMapping("/api/resumes")
public class ResumeController {

    private static final Set<String> ALLOWED_EXTENSIONS =
            Set.of("pdf", "docx");
    private boolean hasValidFileSignature(Path filePath, String extension)
            throws IOException {

        byte[] header = new byte[4];

        try (InputStream inputStream = Files.newInputStream(filePath)) {
            if (inputStream.read(header) < 4) {
                return false;
            }
        }

        if (extension.equals("pdf")) {
            return header[0] == '%'
                    && header[1] == 'P'
                    && header[2] == 'D'
                    && header[3] == 'F';
        }

        if (extension.equals("docx")) {
            return header[0] == 'P'
                    && header[1] == 'K'
                    && header[2] == 3
                    && header[3] == 4;
        }

        return false;
    }

    private final ResumeRepository resumeRepository;
    private final UserRepository userRepository;
    private final ResumeTextExtractionService textExtractionService;
    private final SkillExtractionService skillExtractionService;
    private final SkillMatchingService skillMatchingService;
    private final ResumeMatchRepository resumeMatchRepository;
    private final ResumeContentValidationService resumeContentValidationService;



    public ResumeController(
            ResumeRepository resumeRepository,
            UserRepository userRepository,
            ResumeTextExtractionService textExtractionService,
            SkillExtractionService skillExtractionService,
            SkillMatchingService skillMatchingService,
            ResumeMatchRepository resumeMatchRepository,
            ResumeContentValidationService resumeContentValidationService) {

        this.resumeRepository = resumeRepository;
        this.userRepository = userRepository;
        this.textExtractionService = textExtractionService;
        this.skillExtractionService = skillExtractionService;
        this.skillMatchingService = skillMatchingService;
        this.resumeMatchRepository = resumeMatchRepository;
        this.resumeContentValidationService = resumeContentValidationService;
    }



    @Value("${app.upload.dir}")
    private String uploadDir;



    @PostMapping("/upload")
    public ResponseEntity<Map<String, Object>> uploadResume(
            @RequestParam("file") MultipartFile file) {

        if (file.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Please select a file"));
        }

        String originalFileName = file.getOriginalFilename();


        if (originalFileName == null
                || originalFileName.contains("/")
                || originalFileName.contains("\\")
                || !originalFileName.contains(".")) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Invalid file name"));
        }

        String extension = originalFileName
                .substring(originalFileName.lastIndexOf('.') + 1)
                .toLowerCase();

        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE)
                    .body(Map.of("message",
                            "Only PDF and DOCX files are allowed"));
        }

        if (file.getSize() > 5L * 1024 * 1024) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "File size must not exceed 5 MB"));
        }

        String loggedInEmail = SecurityContextHolder
                .getContext()
                .getAuthentication()
                .getName();

        User user = userRepository.findByEmail(loggedInEmail)
                .orElse(null);

        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "User not found"));
        }

        Path savedPath = null;

        try {
            Path directory = Paths.get(uploadDir)
                    .toAbsolutePath().normalize();

            Files.createDirectories(directory);

            String storedFileName =
                    UUID.randomUUID() + "." + extension;

            savedPath = directory.resolve(storedFileName).normalize();

            if (!savedPath.startsWith(directory)) {
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "Invalid file path"));
            }


            file.transferTo(savedPath);

            String extractedText;

            try {
                // 1. Verify that file content matches its extension
                if (!hasValidFileSignature(savedPath, extension)) {
                    Files.deleteIfExists(savedPath);

                    return ResponseEntity.badRequest()
                            .body(Map.of(
                                    "message",
                                    "Invalid file. File content does not match its extension."
                            ));
                }

                // 2. Parse the actual PDF or DOCX document
                if (extension.equals("pdf")) {
                    extractedText = textExtractionService.extractPdfText(savedPath);
                } else {
                    extractedText = textExtractionService.extractDocxText(savedPath);
                }

            } catch (IOException | RuntimeException e) {
                // Invalid or unreadable document: remove the stored file
                try {
                    Files.deleteIfExists(savedPath);
                } catch (IOException cleanupException) {
                    e.addSuppressed(cleanupException);
                }

                return ResponseEntity.badRequest()
                        .body(Map.of(
                                "message",
                                "Invalid or corrupted document. Please upload a valid PDF or DOCX file."
                        ));
            }

// 3. Reject documents without readable text
            if (extractedText == null || extractedText.isBlank()) {
                Files.deleteIfExists(savedPath);

                return ResponseEntity.badRequest()
                        .body(Map.of(
                                "message",
                                "No readable text found. Please upload a text-based resume."
                        ));
            }

// 4. Continue existing skill extraction
            List<String> extractedSkills =
                    skillExtractionService.extractSkills(extractedText);

            if (!resumeContentValidationService.isLikelyResume(extractedText)) {
                Files.deleteIfExists(savedPath);

                return ResponseEntity.badRequest()
                        .body(Map.of(
                                "message",
                                "This document does not appear to be a resume. Please upload a resume with contact information and relevant sections."
                        ));
            }

            if (!hasValidFileSignature(savedPath, extension)) {
                Files.deleteIfExists(savedPath);

                return ResponseEntity.badRequest()
                        .body(Map.of("message", "File content does not match its extension"));
            }


            if (extension.equals("pdf")) {
                extractedText =
                        textExtractionService.extractPdfText(savedPath);
            } else {
                extractedText =
                        textExtractionService.extractDocxText(savedPath);
            }





            Resume resume = new Resume();
            resume.setUser(user);
            resume.setFileName(originalFileName);
            resume.setFilePath(savedPath.toString());

            Resume savedResume = resumeRepository.save(resume);

            return ResponseEntity.status(HttpStatus.CREATED).body(
                    Map.of(
                            "message", "Resume uploaded successfully",
                            "resumeId", savedResume.getResumeId(),
                            "userId", user.getUserId(),
                            "fileName", savedResume.getFileName()
                    )
            );

        } catch (IOException | RuntimeException e) {
            if (savedPath != null) {
                try {
                    Files.deleteIfExists(savedPath);
                } catch (IOException ignored) {
                    // Log cleanup failure in production.
                }
            }

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Unable to save resume"));
        }
    }


    @PostMapping("/{resumeId}/match")
    public ResponseEntity<Map<String, Object>> matchResume(
            @PathVariable Long resumeId,
            @RequestBody Map<String, String> request) {

        String jobDescription = request.get("jobDescription");

        if (jobDescription == null || jobDescription.isBlank()) {
            return ResponseEntity.badRequest().body(
                    Map.of("message", "Job description is required")
            );
        }

        Resume resume = resumeRepository.findById(resumeId)
                .orElse(null);

        if (resume == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(
                    Map.of("message", "Resume not found")
            );
        }

        String loggedInEmail = SecurityContextHolder
                .getContext()
                .getAuthentication()
                .getName();

        if (!resume.getUser().getEmail()
                .equalsIgnoreCase(loggedInEmail)) {

            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(
                    Map.of(
                            "message",
                            "You are not allowed to access this resume"
                    )
            );
        }

        try {
            Path resumePath = Paths.get(resume.getFilePath());

            String fileName = resume.getFileName().toLowerCase();
            String resumeText;

            if (fileName.endsWith(".pdf")) {
                resumeText =
                        textExtractionService.extractPdfText(resumePath);
            } else if (fileName.endsWith(".docx")) {
                resumeText =
                        textExtractionService.extractDocxText(resumePath);
            } else {
                return ResponseEntity.badRequest().body(
                        Map.of("message", "Unsupported resume format")
                );
            }

            List<String> resumeSkills =
                    skillExtractionService.extractSkills(resumeText);

            List<String> jobSkills =
                    skillExtractionService.extractSkills(jobDescription);


            Map<String, Object> result = new java.util.HashMap<>(
                    skillMatchingService.matchSkills(
                            resumeSkills, jobSkills)
            );

            ResumeMatch resumeMatch = new ResumeMatch();
            resumeMatch.setResume(resume);
            resumeMatch.setMatchPercentage(
                    ((Number) result.get("matchPercentage")).doubleValue()
            );
            resumeMatch.setMatchedSkills(
                    String.join(", ", (List<String>) result.get("matchedSkills"))
            );
            resumeMatch.setMissingSkills(
                    String.join(", ", (List<String>) result.get("missingSkills"))
            );
            resumeMatch.setResumeSkills(String.join(", ", resumeSkills));
            resumeMatch.setJobSkills(String.join(", ", jobSkills));

            ResumeMatch savedMatch = resumeMatchRepository.save(resumeMatch);

            result.put("matchId", savedMatch.getMatchId());
            result.put("resumeId", resumeId);
            result.put("resumeSkills", resumeSkills);
            result.put("jobSkills", jobSkills);

            return ResponseEntity.ok(result);

        } catch (IOException | RuntimeException e) {
            return ResponseEntity.status(
                    HttpStatus.INTERNAL_SERVER_ERROR
            ).body(Map.of("message", "Unable to process resume"));
        }
    }


    @GetMapping("/{resumeId}/matches")
    public ResponseEntity<?> getResumeMatches(
            @PathVariable Long resumeId) {

        Resume resume = resumeRepository.findById(resumeId)
                .orElse(null);

        if (resume == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Resume not found"));
        }

        String loggedInEmail = SecurityContextHolder
                .getContext()
                .getAuthentication()
                .getName();

        if (!resume.getUser().getEmail()
                .equalsIgnoreCase(loggedInEmail)) {

            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of(
                            "message",
                            "You are not allowed to access this resume"
                    ));
        }

        List<ResumeMatch> matches =
                resumeMatchRepository.findByResumeResumeId(resumeId);

        List<Map<String, Object>> response =
                new java.util.ArrayList<>();

        for (ResumeMatch match : matches) {
            Map<String, Object> item = new java.util.HashMap<>();

            item.put("matchId", match.getMatchId());
            item.put("resumeId", resumeId);
            item.put("matchPercentage", match.getMatchPercentage());
            item.put("matchedSkills", match.getMatchedSkills());
            item.put("missingSkills", match.getMissingSkills());
            item.put("matchedAt", match.getMatchedAt());

            response.add(item);
        }

        return ResponseEntity.ok(response);
    }


    @GetMapping("/matches/{matchId}")
    public ResponseEntity<Map<String, Object>> getMatchById(
            @PathVariable Long matchId) {

        ResumeMatch match = resumeMatchRepository
                .findByMatchId(matchId)
                .orElse(null);

        if (match == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Match result not found"));
        }

        String loggedInEmail = SecurityContextHolder
                .getContext()
                .getAuthentication()
                .getName();

        String resumeOwnerEmail = match.getResume()
                .getUser()
                .getEmail();

        if (!resumeOwnerEmail.equalsIgnoreCase(loggedInEmail)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of(
                            "message",
                            "You are not allowed to access this match result"
                    ));
        }

        Map<String, Object> response = new java.util.HashMap<>();

        response.put("matchId", match.getMatchId());
        response.put("resumeId", match.getResume().getResumeId());
        response.put("matchPercentage", match.getMatchPercentage());
        response.put("matchedSkills", match.getMatchedSkills());
        response.put("missingSkills", match.getMissingSkills());
        response.put("resumeSkills", match.getResumeSkills());
        response.put("jobSkills", match.getJobSkills());
        response.put("matchedAt", match.getMatchedAt());

        return ResponseEntity.ok(response);
    }


    @GetMapping("/matches/{matchId}/suggestions")
    public ResponseEntity<Map<String, Object>> getImprovementSuggestions(
            @PathVariable Long matchId) {

        ResumeMatch match = resumeMatchRepository
                .findByMatchId(matchId)
                .orElse(null);

        if (match == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Match result not found"));
        }

        String loggedInEmail = SecurityContextHolder
                .getContext()
                .getAuthentication()
                .getName();

        String ownerEmail = match.getResume()
                .getUser()
                .getEmail();

        if (!ownerEmail.equalsIgnoreCase(loggedInEmail)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of(
                            "message",
                            "You are not allowed to access this match result"
                    ));
        }

        double score = match.getMatchPercentage();

        List<String> missingSkills = new java.util.ArrayList<>();

        String missing = match.getMissingSkills();

        if (missing != null && !missing.isBlank()) {
            for (String skill : missing.split(",")) {
                if (!skill.isBlank()) {
                    missingSkills.add(skill.trim());
                }
            }
        }

        List<String> suggestions = new java.util.ArrayList<>();
        List<String> strengths = new java.util.ArrayList<>();

        if (score >= 80) {
            strengths.add("Strong skill match for this job description.");
        } else if (score >= 60) {
            strengths.add("Good starting match with some skills to improve.");
        } else {
            strengths.add(
                    "Several job requirements may need further attention."
            );
        }

        if (missingSkills.isEmpty()) {
            suggestions.add(
                    "All skills recognized by the current matcher are matched. " +
                            "Review the job description for other requirements."
            );
        } else {
            suggestions.add(
                    "Review these missing skills: " +
                            String.join(", ", missingSkills) + "."
            );

            suggestions.add(
                    "Learn and practise relevant missing skills before adding " +
                            "them to your resume."
            );

            suggestions.add(
                    "If you have genuine project or work experience with these " +
                            "skills, include specific examples in your resume."
            );
        }

        suggestions.add(
                "Tailor your resume summary and project descriptions to the " +
                        "job requirements, using only accurate information."
        );

        Map<String, Object> response = new java.util.HashMap<>();

        response.put("matchId", match.getMatchId());
        response.put("resumeId", match.getResume().getResumeId());
        response.put("matchPercentage", score);
        response.put("strengths", strengths);
        response.put("missingSkills", missingSkills);
        response.put("suggestions", suggestions);

        return ResponseEntity.ok(response);
    }


    @GetMapping
    public ResponseEntity<?> getMyResumes() {

        String loggedInEmail = SecurityContextHolder
                .getContext()
                .getAuthentication()
                .getName();

        User user = userRepository.findByEmail(loggedInEmail)
                .orElse(null);

        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "User not found"));
        }

        List<Resume> resumes =
                resumeRepository.findByUserUserId(user.getUserId());

        List<Map<String, Object>> response =
                new java.util.ArrayList<>();

        for (Resume resume : resumes) {
            Map<String, Object> item = new java.util.HashMap<>();

            item.put("resumeId", resume.getResumeId());
            item.put("fileName", resume.getFileName());
            item.put("uploadedAt", resume.getUploadedAt());

            response.add(item);
        }

        return ResponseEntity.ok(response);
    }


    @GetMapping("/{resumeId}/download")
    public ResponseEntity<?> downloadResume(
            @PathVariable Long resumeId) {

        Resume resume = resumeRepository.findById(resumeId)
                .orElse(null);

        if (resume == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Resume not found"));
        }

        String loggedInEmail = SecurityContextHolder
                .getContext()
                .getAuthentication()
                .getName();

        if (!resume.getUser().getEmail()
                .equalsIgnoreCase(loggedInEmail)) {

            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of(
                            "message",
                            "You are not allowed to download this resume"
                    ));
        }

        try {
            Path filePath = Paths.get(resume.getFilePath())
                    .toAbsolutePath()
                    .normalize();

            if (!Files.isRegularFile(filePath)
                    || !Files.isReadable(filePath)) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("message", "Resume file not found"));
            }

            Resource resource = new UrlResource(filePath.toUri());

            String contentType = resume.getFileName()
                    .toLowerCase()
                    .endsWith(".pdf")
                    ? "application/pdf"
                    : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(
                            HttpHeaders.CONTENT_DISPOSITION,
                            ContentDisposition.attachment()
                                    .filename(resume.getFileName())
                                    .build()
                                    .toString()
                    )
                    .body(resource);

        } catch (IOException | RuntimeException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Unable to download resume"));
        }
    }


    @GetMapping("/{resumeId}/view")
    public ResponseEntity<?> viewResume(
            @PathVariable Long resumeId) {

        Resume resume = resumeRepository.findById(resumeId)
                .orElse(null);

        if (resume == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Resume not found"));
        }

        String loggedInEmail = SecurityContextHolder
                .getContext()
                .getAuthentication()
                .getName();

        if (!resume.getUser().getEmail()
                .equalsIgnoreCase(loggedInEmail)) {

            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of(
                            "message",
                            "You are not allowed to view this resume"
                    ));
        }

        if (!resume.getFileName().toLowerCase().endsWith(".pdf")) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Browser preview is available for PDF files only. Please download the DOCX file."
                    ));
        }

        try {
            Path filePath = Paths.get(resume.getFilePath())
                    .toAbsolutePath()
                    .normalize();

            if (!Files.isRegularFile(filePath)
                    || !Files.isReadable(filePath)) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("message", "Resume file not found"));
            }

            Resource resource = new UrlResource(filePath.toUri());

            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_PDF)
                    .header(
                            HttpHeaders.CONTENT_DISPOSITION,
                            ContentDisposition.inline()
                                    .filename(resume.getFileName())
                                    .build()
                                    .toString()
                    )
                    .body(resource);

        } catch (IOException | RuntimeException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Unable to view resume"));
        }
    }



    @Transactional
    @DeleteMapping("/{resumeId}")
    public ResponseEntity<?> deleteResume(
            @PathVariable Long resumeId) {

        Resume resume = resumeRepository.findById(resumeId)
                .orElse(null);

        if (resume == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Resume not found"));
        }

        String loggedInEmail = SecurityContextHolder
                .getContext()
                .getAuthentication()
                .getName();

        if (!resume.getUser().getEmail()
                .equalsIgnoreCase(loggedInEmail)) {

            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of(
                            "message",
                            "You are not allowed to delete this resume"
                    ));
        }

        try {
            Path filePath = Paths.get(resume.getFilePath());

            resumeMatchRepository
                    .deleteAll(
                            resumeMatchRepository
                                    .findByResumeResumeId(resumeId)
                    );

            resumeRepository.delete(resume);

            Files.deleteIfExists(filePath);

            return ResponseEntity.ok(
                    Map.of("message", "Resume deleted successfully")
            );

        } catch (IOException | RuntimeException e) {
            return ResponseEntity.status(
                    HttpStatus.INTERNAL_SERVER_ERROR
            ).body(Map.of("message", "Unable to delete resume"));
        }
    }


}
