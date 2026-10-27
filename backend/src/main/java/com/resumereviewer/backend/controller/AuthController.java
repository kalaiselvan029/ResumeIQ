
package com.resumereviewer.backend.controller;

import com.resumereviewer.backend.entity.User;
import com.resumereviewer.backend.service.AuthService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import com.resumereviewer.backend.dto.RegisterRequest;
import jakarta.validation.Valid;
import com.resumereviewer.backend.service.JwtService;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final JwtService jwtService;

    public AuthController(
            AuthService authService,
            JwtService jwtService) {
        this.authService = authService;
        this.jwtService = jwtService;
    }

    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(
            @Valid @RequestBody RegisterRequest request) {

        try {
            User savedUser = authService.registerUser(
                    request.getName("name"),
                    request.getEmail("email"),
                    request.getPassword("password")
            );

            Map<String, Object> response = Map.of(
                    "message", "Registration successful",
                    "userId", savedUser.getUserId(),
                    "name", savedUser.getName(),
                    "email", savedUser.getEmail()
            );

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(response);

        } catch (IllegalArgumentException e) {

            return ResponseEntity
                    .status(HttpStatus.CONFLICT)
                    .body(Map.of("message", e.getMessage()));
        }
    }


    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(
            @RequestBody Map<String, String> request) {

        try {
            User user = authService.loginUser(
                    request.get("email"),
                    request.get("password")
            );
            String token = jwtService.generateToken(user.getEmail());

            Map<String, Object> response = Map.of(
                    "message", "Login successful",
                    "userId", user.getUserId(),
                    "name", user.getName(),
                    "email", user.getEmail(),
                    "token", token
            );

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {

            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", e.getMessage()));
        }
    }

}
