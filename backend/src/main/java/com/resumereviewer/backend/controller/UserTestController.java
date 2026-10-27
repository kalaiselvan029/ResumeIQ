
package com.resumereviewer.backend.controller;

import com.resumereviewer.backend.entity.User;
import com.resumereviewer.backend.service.UserService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
public class UserTestController {

    private final UserService userService;

    public UserTestController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/api/test/users")
    public Map<String, Object> saveTestUser(
            @RequestBody Map<String, String> request) {

        User user = new User();
        user.setName(request.get("name"));
        user.setEmail(request.get("email"));

        // Temporary test value only; not for real registration.
        user.setPasswordHash("TEST_ONLY_NOT_A_REAL_HASH");

        User savedUser = userService.saveUser(user);

        return Map.of(
                "message", "Test user saved successfully",
                "userId", savedUser.getUserId(),
                "name", savedUser.getName(),
                "email", savedUser.getEmail()
        );
    }
}
