
package com.resumereviewer.backend.service;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;

@Service
public class ResumeTextExtractionService {

    public String extractPdfText(Path filePath) throws IOException {
        try (PDDocument document =
                     Loader.loadPDF(filePath.toFile())) {

            PDFTextStripper stripper = new PDFTextStripper();
            String text = stripper.getText(document);

            return validateText(text);
        }
    }

    public String extractDocxText(Path filePath) throws IOException {
        try (InputStream inputStream =
                     Files.newInputStream(filePath);
             XWPFDocument document =
                     new XWPFDocument(inputStream);
             XWPFWordExtractor extractor =
                     new XWPFWordExtractor(document)) {

            String text = extractor.getText();

            return validateText(text);
        }
    }

    private String validateText(String text) throws IOException {
        if (text == null || text.isBlank()) {
            throw new IOException(
                    "No readable text found in the resume"
            );
        }

        return text.trim();
    }
}
