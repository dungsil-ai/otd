package ai.dungsil.otd.gradle;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.io.File;
import java.util.Map;
import java.util.Set;
import org.gradle.api.GradleException;
import org.gradle.api.Project;
import org.gradle.testfixtures.ProjectBuilder;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springdoc.openapi.gradle.plugin.OpenApiExtension;

class SpringdocOutputFilesTest {
    @TempDir
    File projectDirectory;

    private File buildDirectory;
    private OpenApiExtension springdoc;

    @BeforeEach
    void setUp() {
        Project project = ProjectBuilder.builder().withProjectDir(projectDirectory).build();
        buildDirectory = project.getLayout().getBuildDirectory().get().getAsFile();
        springdoc = project.getExtensions().create("openApi", OpenApiExtension.class);
        springdoc.getOutputDir().set(project.getLayout().getBuildDirectory().dir("springdoc"));
        springdoc.getOutputFileName().set("custom.json");
    }

    @DisplayName("그룹 매핑이 없으면 단일 Springdoc 출력 파일을 반환한다")
    @Test
    void shouldBeReturnedSingleOutputWhenGroupedMappingsAreEmpty() {
        Set<File> outputs = SpringdocOutputFiles.from(springdoc).get();

        assertEquals(Set.of(new File(buildDirectory, "springdoc/custom.json")), outputs);
    }

    @DisplayName("그룹 매핑이 있으면 그룹별 Springdoc 출력 파일을 반환한다")
    @Test
    void shouldBeReturnedGroupedOutputsWhenGroupedMappingsAreConfigured() {
        springdoc.getGroupedApiMappings().set(Map.of(
                "http://localhost/v3/api-docs/users", "users.json",
                "http://localhost/v3/api-docs/admin", "admin.yaml"));

        Set<File> outputs = SpringdocOutputFiles.from(springdoc).get();

        assertEquals(
                Set.of(
                        new File(buildDirectory, "springdoc/users.json"),
                        new File(buildDirectory, "springdoc/admin.yaml")),
                outputs);
    }

    @DisplayName("단일 Springdoc 출력 파일명이 비어 있으면 거부한다")
    @Test
    void shouldBeRejectedWhenSingleOutputNameIsBlank() {
        springdoc.getOutputFileName().set(" ");

        assertThrows(GradleException.class, () -> SpringdocOutputFiles.from(springdoc).get());
    }

    @DisplayName("그룹별 Springdoc 출력 파일명이 비어 있으면 거부한다")
    @Test
    void shouldBeRejectedWhenGroupedOutputNameIsBlank() {
        springdoc.getGroupedApiMappings().set(Map.of(
                "http://localhost/v3/api-docs/users", "users.json",
                "http://localhost/v3/api-docs/admin", " "));

        assertThrows(GradleException.class, () -> SpringdocOutputFiles.from(springdoc).get());
    }
}
