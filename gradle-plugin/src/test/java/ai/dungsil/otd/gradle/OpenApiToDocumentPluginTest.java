package ai.dungsil.otd.gradle;


import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.Set;
import org.gradle.api.GradleException;
import org.gradle.api.Project;
import org.gradle.testfixtures.ProjectBuilder;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springdoc.openapi.gradle.plugin.OpenApiExtension;

class OpenApiToDocumentPluginTest {
    @TempDir
    File projectDirectory;

    @DisplayName("Springdoc 없이 지연 기본값과 태스크를 등록한다")
    @Test
    void shouldRegisterLazyDefaultsWithoutSpringdoc() {
        Project project = ProjectBuilder.builder().withProjectDir(projectDirectory).build();
        File buildDirectory = project.getLayout().getBuildDirectory().get().getAsFile();

        project.getPluginManager().apply(OpenApiToDocumentPlugin.class);

        OpenApiDocumentExtension extension =
                project.getExtensions().getByType(OpenApiDocumentExtension.class);
        assertEquals("1.0.0", extension.getOtdVersion().get());
        assertEquals(
                new File(buildDirectory, "api-document"),
                extension.getOutputDirectory().get().getAsFile());
        assertInstanceOf(
                GenerateApiDocumentTask.class,
                project.getTasks().getByName(OpenApiToDocumentPlugin.GENERATE_TASK_NAME));
        assertInstanceOf(
                DownloadOtdExecutableTask.class,
                project.getTasks().getByName(OpenApiToDocumentPlugin.DOWNLOAD_TASK_NAME));
    }

    @DisplayName("Springdoc 단일 및 그룹 출력을 해석한다")
    @Test
    void shouldResolveSingleAndGroupedSpringdocOutputs() {
        Project project = ProjectBuilder.builder().withProjectDir(projectDirectory).build();
        File buildDirectory = project.getLayout().getBuildDirectory().get().getAsFile();
        OpenApiExtension springdoc =
                project.getExtensions().create("openApi", OpenApiExtension.class);
        springdoc.getOutputDir().set(project.getLayout().getBuildDirectory().dir("springdoc"));
        springdoc.getOutputFileName().set("custom.json");

        Set<File> single = SpringdocOutputFiles.from(springdoc).get();
        assertEquals(Set.of(new File(buildDirectory, "springdoc/custom.json")), single);

        springdoc.getGroupedApiMappings().set(Map.of(
                "http://localhost/v3/api-docs/users", "users.json",
                "http://localhost/v3/api-docs/admin", "admin.yaml"));
        Set<File> grouped = SpringdocOutputFiles.from(springdoc).get();
        assertEquals(2, grouped.size());
        assertTrue(grouped.contains(new File(buildDirectory, "springdoc/users.json")));
        assertTrue(grouped.contains(new File(buildDirectory, "springdoc/admin.yaml")));
    }

    @DisplayName("미지원 호스트에서도 사용자 실행 파일을 선택한다")
    @Test
    void shouldUseCustomExecutableWithoutResolvingUnsupportedHost() throws IOException {
        Project project = ProjectBuilder.builder().withProjectDir(projectDirectory).build();
        project.getPluginManager().apply(OpenApiToDocumentPlugin.class);
        OpenApiDocumentExtension extension =
                project.getExtensions().getByType(OpenApiDocumentExtension.class);
        Path input = Files.writeString(
                projectDirectory.toPath().resolve("openapi.json"),
                "{\"openapi\":\"3.0.3\"}",
                StandardCharsets.UTF_8);
        Path executable = Files.writeString(
                projectDirectory.toPath().resolve("custom-otd"), "executable", StandardCharsets.UTF_8);
        extension.getOpenApiFiles().from(input.toFile());
        extension.getExecutable().set(executable.toFile());

        String originalOsName = System.getProperty("os.name");
        String originalOsArch = System.getProperty("os.arch");
        System.setProperty("os.name", "FreeBSD");
        System.setProperty("os.arch", "riscv64");
        try {
            GenerateApiDocumentTask generateTask = (GenerateApiDocumentTask)
                    project.getTasks().getByName(OpenApiToDocumentPlugin.GENERATE_TASK_NAME);
            DownloadOtdExecutableTask downloadTask = (DownloadOtdExecutableTask)
                    project.getTasks().getByName(OpenApiToDocumentPlugin.DOWNLOAD_TASK_NAME);

            assertEquals(executable.toFile(), generateTask.getOtdExecutable().get().getAsFile());
            assertFalse(downloadTask.getOnlyIf().isSatisfiedBy(downloadTask));
        } finally {
            restoreSystemProperty("os.name", originalOsName);
            restoreSystemProperty("os.arch", originalOsArch);
        }
    }

    @DisplayName("이식 불가능한 출력 파일명을 거부한다")
    @Test
    void shouldBeRejectedWhenOutputNameIsNotPortable() throws IOException {
        Project project = ProjectBuilder.builder().withProjectDir(projectDirectory).build();
        project.getPluginManager().apply(OpenApiToDocumentPlugin.class);
        OpenApiDocumentExtension extension =
                project.getExtensions().getByType(OpenApiDocumentExtension.class);
        Path input = Files.writeString(
                projectDirectory.toPath().resolve("openapi.json"),
                "{\"openapi\":\"3.0.3\"}",
                StandardCharsets.UTF_8);
        extension.getOpenApiFiles().from(input.toFile());
        GenerateApiDocumentTask task = (GenerateApiDocumentTask)
                project.getTasks().getByName(OpenApiToDocumentPlugin.GENERATE_TASK_NAME);

        extension.getOutputFileName().set("C:report");
        assertThrows(GradleException.class, task::getGeneratedDocuments);

        extension.getOutputFileName().set("\\report");
        assertThrows(GradleException.class, task::getGeneratedDocuments);
    }

    private static void restoreSystemProperty(String name, String value) {
        if (value == null) {
            System.clearProperty(name);
        } else {
            System.setProperty(name, value);
        }
    }
}
