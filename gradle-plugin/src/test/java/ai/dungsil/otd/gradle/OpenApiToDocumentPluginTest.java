package ai.dungsil.otd.gradle;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import org.gradle.api.Project;
import org.gradle.testfixtures.ProjectBuilder;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

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
        assertAll(
                () -> assertEquals(PluginVersion.load(), extension.getOtdVersion().get()),
                () -> assertEquals(
                        new File(buildDirectory, "api-document"),
                        extension.getOutputDirectory().get().getAsFile()),
                () -> assertInstanceOf(
                        GenerateApiDocumentTask.class,
                        project.getTasks().getByName(OpenApiToDocumentPlugin.GENERATE_TASK_NAME)),
                () -> assertInstanceOf(
                        DownloadOtdExecutableTask.class,
                        project.getTasks().getByName(OpenApiToDocumentPlugin.DOWNLOAD_TASK_NAME)));
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

            assertAll(
                    () -> assertEquals(
                            executable.toFile(), generateTask.getOtdExecutable().get().getAsFile()),
                    () -> assertFalse(downloadTask.getOnlyIf().isSatisfiedBy(downloadTask)));
        } finally {
            restoreSystemProperty("os.name", originalOsName);
            restoreSystemProperty("os.arch", originalOsArch);
        }
    }


    private static void restoreSystemProperty(String name, String value) {
        if (value == null) {
            System.clearProperty(name);
        } else {
            System.setProperty(name, value);
        }
    }
}
