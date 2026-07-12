package ai.dungsil.otd.gradle;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Set;
import org.gradle.api.GradleException;
import org.gradle.api.Project;
import org.gradle.testfixtures.ProjectBuilder;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class GenerateApiDocumentTaskTest {
    @TempDir
    Path projectDirectory;

    private GenerateApiDocumentTask task;

    @BeforeEach
    void setUp() {
        Project project = ProjectBuilder.builder()
                .withProjectDir(projectDirectory.toFile())
                .build();
        task = project.getTasks()
                .register("generateApiDocument", GenerateApiDocumentTask.class)
                .get();
        task.getOutputDirectory().set(project.getLayout().getBuildDirectory().dir("specification"));
    }

    @DisplayName("사용자 출력 파일명에 확장자가 없으면 xlsx 확장자를 추가한다")
    @Test
    void shouldBeReturnedXlsxOutputWhenCustomNameHasNoExtension() throws IOException {
        addInput("openapi.json");
        task.getOutputFileName().set("service-contract");

        Set<Path> outputs = generatedDocumentPaths();

        assertEquals(Set.of(outputPath("service-contract.xlsx")), outputs);
    }

    @DisplayName("사용자 출력 파일명의 xlsx 확장자를 대소문자와 무관하게 유지한다")
    @Test
    void shouldBePreservedWhenCustomNameAlreadyHasXlsxExtension() throws IOException {
        addInput("openapi.json");
        task.getOutputFileName().set("Service-Contract.XLSX");

        Set<Path> outputs = generatedDocumentPaths();

        assertEquals(Set.of(outputPath("Service-Contract.XLSX")), outputs);
    }

    @DisplayName("여러 입력은 각 입력 파일명을 기반으로 출력 파일을 만든다")
    @Test
    void shouldBeReturnedInputBasedOutputsWhenMultipleFilesAreConfigured() throws IOException {
        addInput("users.json");
        addInput("admin.yaml");

        Set<Path> outputs = generatedDocumentPaths();

        assertEquals(Set.of(outputPath("users.xlsx"), outputPath("admin.xlsx")), outputs);
    }

    @DisplayName("출력 파일명이 비어 있으면 거부한다")
    @Test
    void shouldBeRejectedWhenOutputNameIsBlank() throws IOException {
        addInput("openapi.json");
        task.getOutputFileName().set(" ");

        assertThrows(GradleException.class, task::getGeneratedDocuments);
    }

    @DisplayName("출력 파일명에 경로 요소가 있으면 거부한다")
    @ParameterizedTest
    @ValueSource(strings = {"C:report", "\\report", "reports/report", ".", ".."})
    void shouldBeRejectedWhenOutputNameIsNotPortable(String outputName) throws IOException {
        addInput("openapi.json");
        task.getOutputFileName().set(outputName);

        assertThrows(GradleException.class, task::getGeneratedDocuments);
    }

    @DisplayName("여러 입력에 단일 출력 파일명을 설정하면 거부한다")
    @Test
    void shouldBeRejectedWhenCustomOutputNameIsUsedWithMultipleInputs() throws IOException {
        addInput("users.json");
        addInput("admin.json");
        task.getOutputFileName().set("api.xlsx");

        assertThrows(GradleException.class, task::getGeneratedDocuments);
    }

    @DisplayName("입력 파일명이 대소문자만 달라 같은 출력 파일을 만들면 거부한다")
    @Test
    void shouldBeRejectedWhenInputNamesProduceCaseInsensitiveCollision() throws IOException {
        addInput("service.json");
        addInput("SERVICE.yaml");

        assertThrows(GradleException.class, task::getGeneratedDocuments);
    }

    private void addInput(String fileName) throws IOException {
        Path input = Files.writeString(
                projectDirectory.resolve(fileName),
                "{\"openapi\":\"3.0.3\"}",
                StandardCharsets.UTF_8);
        task.getOpenApiFiles().from(input.toFile());
    }

    private Path outputPath(String fileName) {
        return task.getOutputDirectory()
                .get()
                .getAsFile()
                .toPath()
                .toAbsolutePath()
                .normalize()
                .resolve(fileName);
    }

    private Set<Path> generatedDocumentPaths() {
        return task.getGeneratedDocuments().stream()
                .map(file -> file.toPath().toAbsolutePath().normalize())
                .collect(java.util.stream.Collectors.toUnmodifiableSet());
    }
}
