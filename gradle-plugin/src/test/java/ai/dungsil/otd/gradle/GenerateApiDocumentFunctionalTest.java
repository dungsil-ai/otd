package ai.dungsil.otd.gradle;

import static org.gradle.testkit.runner.TaskOutcome.SKIPPED;
import static org.gradle.testkit.runner.TaskOutcome.SUCCESS;
import static org.gradle.testkit.runner.TaskOutcome.UP_TO_DATE;
import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URISyntaxException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.atomic.AtomicReference;
import org.gradle.testkit.runner.BuildResult;
import org.gradle.testkit.runner.GradleRunner;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class GenerateApiDocumentFunctionalTest {
    @TempDir
    Path projectDirectory;

    @Test
    void convertsConfiguredOpenApiWithAUserSuppliedExecutable() throws Exception {
        writeFixture();

        BuildResult first = run("generateApiDocument", "--stacktrace");

        assertNotNull(first.task(":downloadOtdExecutable"));
        assertEquals(SKIPPED, first.task(":downloadOtdExecutable").getOutcome());
        assertEquals(SUCCESS, first.task(":generateApiDocument").getOutcome());

        Path document = projectDirectory.resolve("build/specification/service-contract.xlsx");
        String content = Files.readString(document, StandardCharsets.UTF_8);
        assertTrue(content.contains("converted={\"openapi\":\"3.0.3\"}"));
        assertTrue(content.contains("--output"));
        assertTrue(content.contains("--force"));

        BuildResult second = run("generateApiDocument");
        assertEquals(UP_TO_DATE, second.task(":generateApiDocument").getOutcome());
    }

    @Test
    void followsCustomizedSpringdocOutputAndTaskDependency() throws Exception {
        Files.writeString(
                projectDirectory.resolve("settings.gradle"),
                "rootProject.name = 'springdoc-functional-test'\n",
                StandardCharsets.UTF_8);

        Path javaExecutable = Path.of(
                System.getProperty("java.home"),
                "bin",
                isWindows() ? "java.exe" : "java");
        Path fakeOtdClasspath = Path.of(
                FakeOtdMain.class.getProtectionDomain().getCodeSource().getLocation().toURI());
        String buildScript = """
                plugins {
                    id 'java'
                    id 'org.springframework.boot' version '3.5.16'
                    id 'org.springdoc.openapi-gradle-plugin' version '1.9.0'
                    id 'io.github.dungsil-ai.openapi-to-document'
                }

                openApi {
                    outputDir.set(layout.buildDirectory.dir('springdoc'))
                    outputFileName.set('generated-openapi.json')
                }

                def springdocFile = layout.buildDirectory.file('springdoc/generated-openapi.json')
                tasks.named('generateOpenApiDocs') {
                    actions.clear()
                    doLast {
                        springdocFile.get().asFile.parentFile.mkdirs()
                        springdocFile.get().asFile.text = '{"openapi":"3.0.3","info":{"title":"service","version":"1"}}'
                    }
                }
                ['forkedSpringBootRun', 'bootRunMainClassName', 'resolveMainClassName'].each { taskName ->
                    tasks.matching { it.name == taskName }.configureEach {
                        enabled = false
                    }
                }

                openApiDocument {
                    outputDirectory.set(layout.buildDirectory.dir('specification'))
                    executable.set(file('%s'))
                    executableArgs.set(['-cp', '%s', 'ai.dungsil.otd.gradle.FakeOtdMain'])
                }
                """
                .formatted(groovyPath(javaExecutable), groovyPath(fakeOtdClasspath));
        Files.writeString(
                projectDirectory.resolve("build.gradle"), buildScript, StandardCharsets.UTF_8);

        BuildResult result = run("generateApiDocument", "--stacktrace");

        assertEquals(SUCCESS, result.task(":generateOpenApiDocs").getOutcome());
        assertEquals(SUCCESS, result.task(":generateApiDocument").getOutcome());
        Path document = projectDirectory.resolve("build/specification/generated-openapi.xlsx");
        assertTrue(Files.readString(document).contains("\"title\":\"service\""));
    }

    @Test
    void downloadsTheMatchingReleaseExecutable() throws Exception {
        byte[] payload = "fake-otd-executable".getBytes(StandardCharsets.UTF_8);
        AtomicReference<String> requestedPath = new AtomicReference<>();
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", exchange -> {
            requestedPath.set(exchange.getRequestURI().getPath());
            exchange.sendResponseHeaders(200, payload.length);
            try (var response = exchange.getResponseBody()) {
                response.write(payload);
            }
        });
        server.start();

        try {
            Files.writeString(
                    projectDirectory.resolve("settings.gradle"),
                    "rootProject.name = 'download-functional-test'\n",
                    StandardCharsets.UTF_8);
            Files.writeString(
                    projectDirectory.resolve("openapi.json"),
                    "{\"openapi\":\"3.0.3\"}",
                    StandardCharsets.UTF_8);
            String assetName = HostPlatform.current().assetName();
            String buildScript = """
                    plugins {
                        id 'io.github.dungsil-ai.openapi-to-document'
                    }

                    def downloadedExecutable = layout.buildDirectory.file('download/%s')
                    openApiDocument {
                        openApiFiles.from(file('openapi.json'))
                        downloadBaseUrl.set('http://127.0.0.1:%d')
                        executable.set(downloadedExecutable)
                    }
                    tasks.named('downloadOtdExecutable') {
                        destinationFile.set(downloadedExecutable)
                    }
                    """
                    .formatted(assetName, server.getAddress().getPort());
            Files.writeString(
                    projectDirectory.resolve("build.gradle"),
                    buildScript,
                    StandardCharsets.UTF_8);

            BuildResult result = run("downloadOtdExecutable", "--stacktrace");

            assertEquals(SUCCESS, result.task(":downloadOtdExecutable").getOutcome());
            assertEquals("/v1.0.0/" + assetName, requestedPath.get());
            assertArrayEquals(
                    payload, Files.readAllBytes(projectDirectory.resolve("build/download/" + assetName)));
        } finally {
            server.stop(0);
        }
    }

    private BuildResult run(String... arguments) {
        return GradleRunner.create()
                .withProjectDir(projectDirectory.toFile())
                .withPluginClasspath()
                .withArguments(arguments)
                .build();
    }

    private void writeFixture() throws IOException, URISyntaxException {
        Files.writeString(
                projectDirectory.resolve("settings.gradle"),
                "rootProject.name = 'functional-test'\n",
                StandardCharsets.UTF_8);
        Files.writeString(
                projectDirectory.resolve("openapi.json"),
                "{\"openapi\":\"3.0.3\"}",
                StandardCharsets.UTF_8);

        Path javaExecutable = Path.of(
                System.getProperty("java.home"),
                "bin",
                isWindows() ? "java.exe" : "java");
        Path fakeOtdClasspath = Path.of(
                FakeOtdMain.class.getProtectionDomain().getCodeSource().getLocation().toURI());
        String buildScript = """
                plugins {
                    id 'io.github.dungsil-ai.openapi-to-document'
                }

                openApiDocument {
                    openApiFiles.from(file('openapi.json'))
                    outputDirectory.set(layout.buildDirectory.dir('specification'))
                    outputFileName.set('service-contract')
                    executable.set(file('%s'))
                    executableArgs.set(['-cp', '%s', 'ai.dungsil.otd.gradle.FakeOtdMain'])
                }
                """
                .formatted(groovyPath(javaExecutable), groovyPath(fakeOtdClasspath));
        Files.writeString(
                projectDirectory.resolve("build.gradle"), buildScript, StandardCharsets.UTF_8);
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
