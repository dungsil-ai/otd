package ai.dungsil.otd.gradle;

import static org.gradle.testkit.runner.TaskOutcome.SKIPPED;
import static org.gradle.testkit.runner.TaskOutcome.SUCCESS;
import static org.gradle.testkit.runner.TaskOutcome.UP_TO_DATE;
import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URISyntaxException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.gradle.testkit.runner.BuildResult;
import org.gradle.testkit.runner.GradleRunner;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class GenerateApiDocumentFunctionalTest {
    @TempDir
    Path projectDirectory;

    @DisplayName("사용자 실행 파일로 변환하고 up-to-date 상태를 유지한다")
    @Test
    void shouldBeConvertedWithUserSuppliedExecutable() throws Exception {
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

    @DisplayName("Springdoc 사용자 출력과 선행 태스크를 연동한다")
    @Test
    void shouldUseCustomizedSpringdocOutputAndTaskDependency() throws Exception {
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

    @DisplayName("OpenAPI 참조 키가 있으면 외부 참조 변경 후 다시 변환한다")
    @Test
    void shouldBeRegeneratedWhenReferencedOpenApiFileChanges() throws Exception {
        writeFixture();
        Files.writeString(
                projectDirectory.resolve("openapi.json"),
                "{\"openapi\":\"3.0.3\",\"components\":{\"schemas\":{\"User\":{\"$ref\":\"user.json\"}}}}",
                StandardCharsets.UTF_8);
        Path referencedFile = Files.writeString(
                projectDirectory.resolve("user.json"),
                "{\"type\":\"object\"}",
                StandardCharsets.UTF_8);

        BuildResult first = run("generateApiDocument", "--stacktrace");
        assertEquals(SUCCESS, first.task(":generateApiDocument").getOutcome());

        Files.writeString(
                referencedFile,
                "{\"type\":\"object\",\"required\":[\"id\"]}",
                StandardCharsets.UTF_8);
        BuildResult second = run("generateApiDocument", "--stacktrace");

        assertEquals(SUCCESS, second.task(":generateApiDocument").getOutcome());
    }

    @DisplayName("설정에서 제거한 OpenAPI 입력의 기존 문서를 삭제한다")
    @Test
    void shouldBeRemovedObsoleteDocumentWhenInputIsNoLongerConfigured() throws Exception {
        writeFixture();
        Files.writeString(
                projectDirectory.resolve("admin.json"),
                "{\"openapi\":\"3.0.3\"}",
                StandardCharsets.UTF_8);
        Path buildFile = projectDirectory.resolve("build.gradle");
        String multipleInputs = Files.readString(buildFile, StandardCharsets.UTF_8)
                .replace(
                        "openApiFiles.from(file('openapi.json'))",
                        "openApiFiles.from(file('openapi.json'), file('admin.json'))")
                .replace("outputFileName.set('service-contract')", "");
        Files.writeString(buildFile, multipleInputs, StandardCharsets.UTF_8);

        BuildResult first = run("generateApiDocument", "--stacktrace");
        assertEquals(SUCCESS, first.task(":generateApiDocument").getOutcome());
        Path obsoleteDocument = projectDirectory.resolve("build/specification/admin.xlsx");
        assertTrue(Files.isRegularFile(obsoleteDocument));

        Files.writeString(
                buildFile,
                multipleInputs.replace(
                        "file('openapi.json'), file('admin.json')", "file('openapi.json')"),
                StandardCharsets.UTF_8);
        BuildResult second = run("generateApiDocument", "--stacktrace");

        assertEquals(SUCCESS, second.task(":generateApiDocument").getOutcome());
        assertFalse(Files.exists(obsoleteDocument));
    }

    @DisplayName("다운로드 출처가 바뀌면 관리 실행 파일을 갱신한다")
    @Test
    void shouldRefreshManagedExecutableWhenDownloadSourceChanges() throws Exception {
        byte[] initialPayload = "fake-otd-executable".getBytes(StandardCharsets.UTF_8);
        AtomicReference<byte[]> payload = new AtomicReference<>(initialPayload);
        AtomicReference<String> requestedPath = new AtomicReference<>();
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", exchange -> {
            requestedPath.set(exchange.getRequestURI().getPath());
            byte[] responsePayload = payload.get();
            exchange.sendResponseHeaders(200, responsePayload.length);
            try (var response = exchange.getResponseBody()) {
                response.write(responsePayload);
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
            String baseUrl = "http://127.0.0.1:%d".formatted(server.getAddress().getPort());
            String buildScript = """
                    plugins {
                        id 'io.github.dungsil-ai.openapi-to-document'
                    }

                    openApiDocument {
                        openApiFiles.from(file('openapi.json'))
                        downloadBaseUrl.set('%s')
                        otdVersion.set('test-version')
                    }
                    """
                    .formatted(baseUrl);
            Files.writeString(
                    projectDirectory.resolve("build.gradle"),
                    buildScript,
                    StandardCharsets.UTF_8);

            Path testKitDirectory = Path.of(
                            "build", "test-kit", projectDirectory.getFileName().toString())
                    .toAbsolutePath();
            BuildResult result = run(testKitDirectory, "downloadOtdExecutable", "--stacktrace");

            assertEquals(SUCCESS, result.task(":downloadOtdExecutable").getOutcome());
            assertEquals("/vtest-version/" + assetName, requestedPath.get());
            List<Path> initialDownloads =
                    downloadedExecutables(testKitDirectory, "test-version", assetName);
            assertEquals(1, initialDownloads.size());
            Path downloadedExecutable = initialDownloads.get(0);
            assertArrayEquals(initialPayload, Files.readAllBytes(downloadedExecutable));

            if (!isWindows()) {
                assertTrue(downloadedExecutable.toFile().setExecutable(false, false));

                BuildResult repaired =
                        run(testKitDirectory, "downloadOtdExecutable", "--stacktrace");

                assertEquals(SUCCESS, repaired.task(":downloadOtdExecutable").getOutcome());
                assertTrue(Files.isExecutable(downloadedExecutable));
            }

            byte[] mirroredPayload = "mirrored-otd-executable".getBytes(StandardCharsets.UTF_8);
            payload.set(mirroredPayload);
            Files.writeString(
                    projectDirectory.resolve("build.gradle"),
                    buildScript.replace(baseUrl, baseUrl + "/mirror"),
                    StandardCharsets.UTF_8);

            BuildResult refreshed = run(testKitDirectory, "downloadOtdExecutable", "--stacktrace");

            assertEquals(SUCCESS, refreshed.task(":downloadOtdExecutable").getOutcome());
            assertEquals("/mirror/vtest-version/" + assetName, requestedPath.get());
            List<Path> refreshedDownloads =
                    downloadedExecutables(testKitDirectory, "test-version", assetName);
            assertEquals(2, refreshedDownloads.size());
            assertArrayEquals(initialPayload, Files.readAllBytes(downloadedExecutable));
            assertTrue(refreshedDownloads.stream().anyMatch(path -> {
                try {
                    return java.util.Arrays.equals(mirroredPayload, Files.readAllBytes(path));
                } catch (IOException error) {
                    throw new java.io.UncheckedIOException(error);
                }
            }));
        } finally {
            server.stop(0);
        }
    }

    @DisplayName("실행 파일이 새 문서를 생성하지 않으면 실패한다")
    @Test
    void shouldBeRejectedWhenExecutableDoesNotCreateAFreshDocument() throws Exception {
        writeFixture();
        BuildResult first = run("generateApiDocument", "--stacktrace");
        assertEquals(SUCCESS, first.task(":generateApiDocument").getOutcome());

        Path document = projectDirectory.resolve("build/specification/service-contract.xlsx");
        Files.writeString(
                projectDirectory.resolve("build.gradle"),
                System.lineSeparator()
                        + "openApiDocument { executableArgs.add('--no-output') }"
                        + System.lineSeparator(),
                StandardCharsets.UTF_8,
                java.nio.file.StandardOpenOption.APPEND);
        Files.writeString(
                projectDirectory.resolve("openapi.json"),
                "{\"openapi\":\"3.1.0\"}",
                StandardCharsets.UTF_8);

        BuildResult failed = runAndFail("generateApiDocument", "--stacktrace");

        assertTrue(failed.getOutput().contains("OTD did not create the expected document"));
        assertFalse(Files.exists(document));
    }

    @DisplayName("병렬 하위 프로젝트에서 관리 실행 파일을 한 번만 다운로드한다")
    @Test
    void shouldBeDownloadedOnceWhenSubprojectsRunInParallel() throws Exception {
        byte[] payload = "parallel-otd-executable".getBytes(StandardCharsets.UTF_8);
        AtomicInteger requestCount = new AtomicInteger();
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", exchange -> {
            requestCount.incrementAndGet();
            try {
                Thread.sleep(300);
            } catch (InterruptedException error) {
                Thread.currentThread().interrupt();
                throw new IOException("Interrupted test download", error);
            }
            exchange.sendResponseHeaders(200, payload.length);
            try (var response = exchange.getResponseBody()) {
                response.write(payload);
            }
        });
        server.start();

        try {
            Files.writeString(
                    projectDirectory.resolve("settings.gradle"),
                    "rootProject.name = 'parallel-download-test'\ninclude 'first', 'second'\n",
                    StandardCharsets.UTF_8);
            for (String projectName : List.of("first", "second")) {
                Path subproject = Files.createDirectories(projectDirectory.resolve(projectName));
                Files.writeString(
                        subproject.resolve("openapi.json"),
                        "{\"openapi\":\"3.0.3\"}",
                        StandardCharsets.UTF_8);
            }
            String buildScript = """
                    plugins {
                        id 'io.github.dungsil-ai.openapi-to-document' apply false
                    }

                    subprojects {
                        apply plugin: 'io.github.dungsil-ai.openapi-to-document'
                        openApiDocument {
                            openApiFiles.from(file('openapi.json'))
                            downloadBaseUrl.set('http://127.0.0.1:%d')
                        }
                    }
                    """
                    .formatted(server.getAddress().getPort());
            Files.writeString(
                    projectDirectory.resolve("build.gradle"), buildScript, StandardCharsets.UTF_8);

            Path testKitDirectory = Path.of(
                            "build", "test-kit", projectDirectory.getFileName().toString())
                    .toAbsolutePath();
            BuildResult result = run(
                    testKitDirectory,
                    "--parallel",
                    ":first:downloadOtdExecutable",
                    ":second:downloadOtdExecutable",
                    "--stacktrace");

            assertEquals(SUCCESS, result.task(":first:downloadOtdExecutable").getOutcome());
            assertEquals(SUCCESS, result.task(":second:downloadOtdExecutable").getOutcome());
            assertEquals(1, requestCount.get());
        } finally {
            server.stop(0);
        }
    }

    private BuildResult run(String... arguments) {
        return runner().withArguments(arguments).build();
    }

    private BuildResult runAndFail(String... arguments) {
        return runner().withArguments(arguments).buildAndFail();
    }

    private BuildResult run(Path testKitDirectory, String... arguments) {
        return runner().withTestKitDir(testKitDirectory.toFile()).withArguments(arguments).build();
    }

    private GradleRunner runner() {
        return GradleRunner.create()
                .withProjectDir(projectDirectory.toFile())
                .withPluginClasspath();
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

    private static List<Path> downloadedExecutables(
            Path testKitDirectory, String version, String assetName) throws IOException {
        Path versionDirectory = testKitDirectory.resolve("caches/openapi-to-document").resolve(version);
        try (var paths = Files.walk(versionDirectory)) {
            return paths.filter(Files::isRegularFile)
                    .filter(path -> path.getFileName().toString().equals(assetName))
                    .sorted()
                    .toList();
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
        return DownloadOtdExecutableTask.isWindows(System.getProperty("os.name", ""));
    }
}
