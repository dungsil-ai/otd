package ai.dungsil.otd.gradle;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.InvalidPathException;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import javax.inject.Inject;
import org.gradle.api.DefaultTask;
import org.gradle.api.GradleException;
import org.gradle.api.file.ConfigurableFileCollection;
import org.gradle.api.file.DirectoryProperty;
import org.gradle.api.file.RegularFileProperty;
import org.gradle.api.provider.ListProperty;
import org.gradle.api.provider.Property;
import org.gradle.api.tasks.Input;
import org.gradle.api.tasks.InputFile;
import org.gradle.api.tasks.InputFiles;
import org.gradle.api.tasks.Internal;
import org.gradle.api.tasks.OutputFiles;
import org.gradle.api.tasks.OutputFile;
import org.gradle.api.tasks.PathSensitive;
import org.gradle.api.tasks.PathSensitivity;
import org.gradle.api.tasks.TaskAction;
import org.gradle.process.ExecOperations;
import org.gradle.work.DisableCachingByDefault;

/** OpenAPI 입력을 XLSX 명세서로 변환하는 태스크 */
@DisableCachingByDefault(because = "OTD embeds creation metadata in generated workbooks")
public abstract class GenerateApiDocumentTask extends DefaultTask {
    private static final String OUTPUT_MANIFEST_FILE_NAME = ".openapi-to-document.outputs";
    private final ExecOperations execOperations;

    /**
     * 변환 태스크 생성
     *
     * @param execOperations Gradle 프로세스 실행 서비스
     */
    @Inject
    public GenerateApiDocumentTask(ExecOperations execOperations) {
        this.execOperations = execOperations;
        getOutputs().upToDateWhen(ignored -> openApiInputsHaveNoReferences());
    }

    /**
     * OpenAPI 입력 파일
     *
     * @return 변환할 OpenAPI JSON 또는 YAML 파일 모음
     */
    @InputFiles
    @PathSensitive(PathSensitivity.RELATIVE)
    public abstract ConfigurableFileCollection getOpenApiFiles();

    /**
     * 생성 문서 출력 디렉터리
     *
     * @return XLSX 문서 출력 디렉터리
     */
    @Internal
    public abstract DirectoryProperty getOutputDirectory();

    /**
     * 단일 입력의 출력 파일명
     *
     * @return 선택적 XLSX 출력 파일명
     */
    @Internal
    public abstract Property<String> getOutputFileName();

    /**
     * OTD 실행 파일
     *
     * @return 변환에 사용할 OTD 실행 파일
     */
    @InputFile
    @PathSensitive(PathSensitivity.NONE)
    public abstract RegularFileProperty getOtdExecutable();

    /**
     * OTD 실행 접두 인수
     *
     * @return 실행 파일 경로 뒤에 삽입할 인수
     */
    @Input
    public abstract ListProperty<String> getExecutableArgs();

    /**
     * 예상 생성 문서
     * <p>
     * 입력별 출력 파일명을 결정하고 중복 목적지와 잘못된 파일명을 검증한다.
     *
     * @return 태스크가 생성할 XLSX 파일 집합
     * @throws GradleException 입력과 출력 파일명 조합이 유효하지 않은 경우
     */
    @OutputFiles
    public Set<File> getGeneratedDocuments() {
        return createConversionPlan().values().stream()
                .map(Path::toFile)
                .collect(Collectors.toUnmodifiableSet());
    }

    /**
     * 이전 실행의 생성 문서 목록
     *
     * @return 태스크가 관리하는 출력 manifest 파일
     */
    @OutputFile
    public File getOutputManifest() {
        return getOutputDirectory()
                .file(OUTPUT_MANIFEST_FILE_NAME)
                .get()
                .getAsFile();
    }

    /**
     * API 명세서 생성
     * <p>
     * 구성된 OpenAPI 입력마다 OTD를 한 번 실행한다. 기존 출력은 제거하며 실행 후 새 비어 있지
     * 않은 파일이 생성되었는지 검증한다.
     *
     * @throws GradleException 입력, 실행 파일 또는 생성 결과가 유효하지 않은 경우
     */
    @TaskAction
    public void generate() {
        Map<Path, Path> conversions = createConversionPlan();
        if (conversions.isEmpty()) {
            throw new GradleException(
                    "No OpenAPI files were configured. Apply org.springdoc.openapi-gradle-plugin "
                            + "or add files to openApiDocument.openApiFiles.");
        }

        Path executable = getOtdExecutable().get().getAsFile().toPath();
        if (!java.nio.file.Files.isRegularFile(executable)) {
            throw new GradleException("OTD executable is not a file: " + executable);
        }

        Path outputDirectory = getOutputDirectory()
                .get()
                .getAsFile()
                .toPath()
                .toAbsolutePath()
                .normalize();
        try {
            java.nio.file.Files.createDirectories(outputDirectory);
        } catch (IOException error) {
            throw new GradleException("Unable to create output directory " + outputDirectory, error);
        }

        Set<Path> currentOutputs = new LinkedHashSet<>(conversions.values());
        deleteObsoleteOutputs(outputDirectory, currentOutputs);
        for (Map.Entry<Path, Path> conversion : conversions.entrySet()) {
            Path output = conversion.getValue();
            deleteExistingOutput(output);
            runOtd(conversion.getKey(), output);
            try {
                if (!java.nio.file.Files.isRegularFile(output)
                        || java.nio.file.Files.size(output) == 0) {
                    throw new GradleException("OTD did not create the expected document: " + output);
                }
            } catch (IOException error) {
                throw new GradleException("Unable to inspect generated document " + output, error);
            }
        }
        writeOutputManifest(outputDirectory, currentOutputs);
    }

    private static void deleteExistingOutput(Path output) {
        try {
            java.nio.file.Files.deleteIfExists(output);
        } catch (IOException error) {
            throw new GradleException("Unable to remove existing document " + output, error);
        }
    }

    private boolean openApiInputsHaveNoReferences() {
        for (File input : getOpenApiFiles().getFiles()) {
            try {
                if (java.nio.file.Files.readString(input.toPath(), StandardCharsets.UTF_8)
                        .contains("$ref")) {
                    return false;
                }
            } catch (IOException error) {
                return false;
            }
        }
        return true;
    }

    private static void deleteObsoleteOutputs(Path outputDirectory, Set<Path> currentOutputs) {
        Path manifest = outputDirectory.resolve(OUTPUT_MANIFEST_FILE_NAME);
        if (!java.nio.file.Files.isRegularFile(manifest)) {
            return;
        }

        try {
            for (String encodedName : java.nio.file.Files.readAllLines(manifest, StandardCharsets.UTF_8)) {
                String fileName = new String(
                        Base64.getUrlDecoder().decode(encodedName), StandardCharsets.UTF_8);
                Path previousOutput = outputDirectory.resolve(fileName).normalize();
                if (!outputDirectory.equals(previousOutput.getParent())) {
                    throw new GradleException("Invalid generated document manifest entry: " + fileName);
                }
                if (!currentOutputs.contains(previousOutput)) {
                    java.nio.file.Files.deleteIfExists(previousOutput);
                }
            }
        } catch (IOException | IllegalArgumentException error) {
            throw new GradleException("Unable to reconcile generated documents in " + outputDirectory, error);
        }
    }

    private static void writeOutputManifest(Path outputDirectory, Set<Path> currentOutputs) {
        Path manifest = outputDirectory.resolve(OUTPUT_MANIFEST_FILE_NAME);
        Path temporary = manifest.resolveSibling(
                manifest.getFileName() + "." + UUID.randomUUID() + ".tmp");
        List<String> entries = currentOutputs.stream()
                .map(path -> path.getFileName().toString())
                .sorted()
                .map(name -> Base64.getUrlEncoder()
                        .withoutPadding()
                        .encodeToString(name.getBytes(StandardCharsets.UTF_8)))
                .toList();

        try {
            java.nio.file.Files.write(temporary, entries, StandardCharsets.UTF_8);
            try {
                java.nio.file.Files.move(
                        temporary,
                        manifest,
                        StandardCopyOption.ATOMIC_MOVE,
                        StandardCopyOption.REPLACE_EXISTING);
            } catch (AtomicMoveNotSupportedException ignored) {
                java.nio.file.Files.move(temporary, manifest, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException error) {
            throw new GradleException("Unable to record generated documents in " + outputDirectory, error);
        } finally {
            try {
                java.nio.file.Files.deleteIfExists(temporary);
            } catch (IOException ignored) {
                // 다음 실행에서 교체할 수 있으므로 임시 manifest를 유지한다.
            }
        }
    }

    private Map<Path, Path> createConversionPlan() {
        List<Path> inputs = getOpenApiFiles().getFiles().stream()
                .map(File::toPath)
                .map(path -> path.toAbsolutePath().normalize())
                .distinct()
                .sorted(Comparator.comparing(Path::toString))
                .toList();

        String configuredOutputName = getOutputFileName().getOrNull();
        if (configuredOutputName != null && inputs.size() > 1) {
            throw new GradleException(
                    "openApiDocument.outputFileName can only be used with one OpenAPI file");
        }

        Path outputDirectory =
                getOutputDirectory().get().getAsFile().toPath().toAbsolutePath().normalize();
        Map<Path, Path> conversions = new LinkedHashMap<>();
        Map<String, Path> destinations = new LinkedHashMap<>();

        for (Path input : inputs) {
            String outputName = configuredOutputName != null
                    ? normalizeOutputName(configuredOutputName)
                    : normalizeOutputName(fileStem(input.getFileName().toString()));
            Path output = outputDirectory.resolve(outputName).normalize();
            String collisionKey = output.toString().toLowerCase(Locale.ROOT);
            Path previousInput = destinations.putIfAbsent(collisionKey, input);
            if (previousInput != null) {
                throw new GradleException(
                        "OpenAPI inputs produce the same output document '"
                                + outputName
                                + "': "
                                + previousInput
                                + " and "
                                + input);
            }
            conversions.put(input, output);
        }
        return conversions;
    }

    private void runOtd(Path input, Path output) {
        if (!input.toFile().isFile()) {
            throw new GradleException("OpenAPI input is not a file: " + input);
        }

        List<String> command = new ArrayList<>();
        command.add(getOtdExecutable().get().getAsFile().getAbsolutePath());
        command.addAll(getExecutableArgs().get());
        command.add(input.toString());
        command.add("--output");
        command.add(output.toString());
        command.add("--force");

        getLogger().lifecycle("Generating API document {}", output);
        execOperations.exec(spec -> spec.commandLine(command));
    }

    private static String normalizeOutputName(String value) {
        String name = value.trim();
        if (name.isEmpty()) {
            throw new GradleException("openApiDocument.outputFileName must not be blank");
        }

        try {
            Path path = Path.of(name);
            if (path.isAbsolute()
                    || path.getRoot() != null
                    || path.getNameCount() != 1
                    || !path.getFileName().toString().equals(name)
                    || name.indexOf('/') >= 0
                    || name.indexOf('\\') >= 0
                    || name.indexOf(':') >= 0
                    || name.equals(".")
                    || name.equals("..")) {
                throw new GradleException(
                        "openApiDocument.outputFileName must be a file name, not a path: " + value);
            }
        } catch (InvalidPathException error) {
            throw new GradleException("Invalid openApiDocument.outputFileName: " + value, error);
        }

        return name.toLowerCase(Locale.ROOT).endsWith(".xlsx") ? name : name + ".xlsx";
    }

    private static String fileStem(String fileName) {
        int extension = fileName.lastIndexOf('.');
        return extension > 0 ? fileName.substring(0, extension) : fileName;
    }
}
