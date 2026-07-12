package ai.dungsil.otd.samples;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Greetings", description = "인사말 API")
@RestController
@RequestMapping("/api/greetings")
final class GreetingController {
    @Operation(summary = "이름으로 인사말 조회")
    @GetMapping("/{name}")
    GreetingResponse greet(@PathVariable String name) {
        return new GreetingResponse("Hello, " + name + "!");
    }

    record GreetingResponse(String message) {}
}
