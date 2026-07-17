package ai.dungsil.otd.gradle;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.io.File;
import java.util.Map;
import java.util.Set;
import org.gradle.api.GradleException;
import org.gradle.api.Project;
import org.gradle.api.file.DirectoryProperty;
import org.gradle.api.provider.MapProperty;
import org.gradle.api.provider.Property;
import org.gradle.testfixtures.ProjectBuilder;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springdoc.openapi.gradle.plugin.OpenApiExtension;

class SpringdocOutputFilesTest {
    @TempDir
    File projectDirectory;

    private Project project;
    private File buildDirectory;
    private OpenApiExtension springdoc;

    @BeforeEach
    void setUp() {
        project = ProjectBuilder.builder().withProjectDir(projectDirectory).build();
        buildDirectory = project.getLayout().getBuildDirectory().get().getAsFile();
        springdoc = project.getExtensions().create("openApi", OpenApiExtension.class);
        springdoc.getOutputDir().set(project.getLayout().getBuildDirectory().dir("springdoc"));
        springdoc.getOutputFileName().set("custom.json");
    }

    @DisplayName("그룹 매핑이 없으면 단일 Springdoc 출력 파일을 반환한다")
    @Test
    void shouldBeReturnedSingleOutputWhenGroupedMappingsAreEmpty() {
        Set<File> outputs = SpringdocOutputFiles.from(project, springdoc).get();

        assertEquals(Set.of(new File(buildDirectory, "springdoc/custom.json")), outputs);
    }

    @DisplayName("그룹 매핑이 있으면 그룹별 Springdoc 출력 파일을 반환한다")
    @Test
    void shouldBeReturnedGroupedOutputsWhenGroupedMappingsAreConfigured() {
        springdoc.getGroupedApiMappings().set(Map.of(
                "http://localhost/v3/api-docs/users", "users.json",
                "http://localhost/v3/api-docs/admin", "admin.yaml"));

        Set<File> outputs = SpringdocOutputFiles.from(project, springdoc).get();

        assertEquals(
                Set.of(
                        new File(buildDirectory, "springdoc/users.json"),
                        new File(buildDirectory, "springdoc/admin.yaml")),
                outputs);
    }

    @DisplayName("Springdoc 확장값이 없으면 1.7 기본 출력 파일을 반환한다")
    @Test
    void shouldBeReturnedLegacyDefaultOutputWhenExtensionValuesAreAbsent() {
        ConventionlessSpringdocExtension legacy = new ConventionlessSpringdocExtension(project);

        Set<File> outputs = SpringdocOutputFiles.from(project, legacy).get();

        assertEquals(Set.of(new File(buildDirectory, "openapi.json")), outputs);
    }

    @DisplayName("그룹 출력에서는 Springdoc 단일 출력 파일명이 없어도 된다")
    @Test
    void shouldBeReturnedLegacyGroupedOutputsWithoutSingleOutputName() {
        ConventionlessSpringdocExtension legacy = new ConventionlessSpringdocExtension(project);
        legacy.getOutputDir().set(project.getLayout().getBuildDirectory().dir("springdoc"));
        legacy.getGroupedApiMappings().set(Map.of(
                "http://localhost/v3/api-docs/users", "users.json",
                "http://localhost/v3/api-docs/admin", "admin.yaml"));

        Set<File> outputs = SpringdocOutputFiles.from(project, legacy).get();

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

        assertThrows(
                GradleException.class, () -> SpringdocOutputFiles.from(project, springdoc).get());
    }

    @DisplayName("그룹별 Springdoc 출력 파일명이 비어 있으면 거부한다")
    @Test
    void shouldBeRejectedWhenGroupedOutputNameIsBlank() {
        springdoc.getGroupedApiMappings().set(Map.of(
                "http://localhost/v3/api-docs/users", "users.json",
                "http://localhost/v3/api-docs/admin", " "));

        assertThrows(
                GradleException.class, () -> SpringdocOutputFiles.from(project, springdoc).get());
    }
    static final class ConventionlessSpringdocExtension {
        private final MapProperty<String, String> groupedApiMappings;
        private final Property<String> outputFileName;
        private final DirectoryProperty outputDir;

        ConventionlessSpringdocExtension(Project project) {
            groupedApiMappings = project.getObjects().mapProperty(String.class, String.class);
            outputFileName = project.getObjects().property(String.class);
            outputDir = project.getObjects().directoryProperty();
        }

        public MapProperty<String, String> getGroupedApiMappings() {
            return groupedApiMappings;
        }

        public Property<String> getOutputFileName() {
            return outputFileName;
        }

        public DirectoryProperty getOutputDir() {
            return outputDir;
        }
    }

}
