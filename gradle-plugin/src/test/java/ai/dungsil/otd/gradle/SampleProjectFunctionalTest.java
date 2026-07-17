package ai.dungsil.otd.gradle;

import static org.gradle.testkit.runner.TaskOutcome.SKIPPED;
import static org.gradle.testkit.runner.TaskOutcome.SUCCESS;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.net.URISyntaxException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.stream.Stream;
import org.gradle.testkit.runner.BuildResult;
import org.gradle.testkit.runner.GradleRunner;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class SampleProjectFunctionalTest {
    @TempDir
    Path projectDirectory;

    @DisplayName("Spring Boot 샘플에서 OpenAPI와 XLSX 명세서를 연속 생성한다")
    @Test
    void shouldGenerateDocumentFromSpringBootSample() throws Exception {
        copySampleProject();
        Path initScript = writeFakeOtdInitScript();

        BuildResult result = GradleRunner.create()
                .withProjectDir(projectDirectory.toFile())
                .withPluginClasspath()
                .withArguments("generateApiDocument", "--init-script", initScript.toString(), "--stacktrace")
                .build();

        assertNotNull(result.task(":downloadOtdExecutable"));
        assertEquals(SKIPPED, result.task(":downloadOtdExecutable").getOutcome());
        assertEquals(SUCCESS, result.task(":generateOpenApiDocs").getOutcome());
        assertEquals(SUCCESS, result.task(":generateApiDocument").getOutcome());

        Path openApi = projectDirectory.resolve("build/openapi/openapi.json");
        Path document = projectDirectory.resolve("build/api-specification/sample-api.xlsx");
        assertTrue(Files.readString(openApi).contains("\"/api/greetings/{name}\""));
        assertTrue(Files.readString(document).contains("\"/api/greetings/{name}\""));
    }

    private void copySampleProject() throws IOException {
        Path sampleDirectory = Path.of(System.getProperty("user.dir"), "samples", "spring-boot-webmvc");
        Files.copy(sampleDirectory.resolve("build.gradle.kts"), projectDirectory.resolve("build.gradle.kts"));
        copyDirectory(sampleDirectory.resolve("src"), projectDirectory.resolve("src"));
        Files.writeString(
                projectDirectory.resolve("settings.gradle.kts"),
                """
                pluginManagement {
                    repositories {
                        gradlePluginPortal()
                        mavenCentral()
                    }
                }

                rootProject.name = "openapi-to-document-sample-test"
                """,
                StandardCharsets.UTF_8);
    }

    private Path writeFakeOtdInitScript() throws IOException, URISyntaxException {
        Path javaExecutable = Path.of(
                System.getProperty("java.home"),
                "bin",
                isWindows() ? "java.exe" : "java");
        Path fakeOtdClasspath = Path.of(
                FakeOtdMain.class.getProtectionDomain().getCodeSource().getLocation().toURI());
        String script = """
                allprojects {
                    plugins.withId('io.github.dungsil-ai.openapi-to-document') {
                        def extension = extensions.getByName('openApiDocument')
                        extension.executable.set(file('%s'))
                        extension.executableArgs.set(['-cp', '%s', 'ai.dungsil.otd.gradle.FakeOtdMain'])
                    }
                }
                """
                .formatted(groovyPath(javaExecutable), groovyPath(fakeOtdClasspath));
        return Files.writeString(
                projectDirectory.resolve("sample-test.init.gradle"), script, StandardCharsets.UTF_8);
    }

    private static void copyDirectory(Path source, Path target) throws IOException {
        try (Stream<Path> paths = Files.walk(source)) {
            for (Path path : paths.toList()) {
                Path destination = target.resolve(source.relativize(path).toString());
                if (Files.isDirectory(path)) {
                    Files.createDirectories(destination);
                } else {
                    Files.copy(path, destination);
                }
            }
        }
    }

    private static String groovyPath(Path path) {
        return path.toAbsolutePath()
                .normalize()
                .toString()
                .replace('\\', '/')
                .replace("'", "\\'");
    }

    private static boolean isWindows() {
        return System.getProperty("os.name", "").toLowerCase().contains("win");
    }
}
