package ai.dungsil.otd.gradle;


import java.io.File;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.channels.FileChannel;
import java.nio.channels.FileLock;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.time.Duration;
import java.util.Locale;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.locks.ReentrantLock;
import java.util.UUID;
import org.gradle.api.DefaultTask;
import org.gradle.api.GradleException;
import org.gradle.api.file.RegularFileProperty;
import org.gradle.api.provider.Property;
import org.gradle.api.tasks.Input;
import org.gradle.api.tasks.OutputFile;
import org.gradle.api.tasks.TaskAction;
import org.gradle.work.DisableCachingByDefault;

/** 플랫폼별 OTD 실행 파일 다운로드 태스크 */
@DisableCachingByDefault(because = "The executable is stored in the shared Gradle user home cache")
public abstract class DownloadOtdExecutableTask extends DefaultTask {
    private static final ConcurrentMap<Path, ReentrantLock> PROCESS_LOCKS =
            new ConcurrentHashMap<>();

    /** 다운로드 태스크 생성 */
    public DownloadOtdExecutableTask() {}

    /**
     * 릴리스 자산 URL
     *
     * @return OTD 실행 파일 다운로드 URL
     */
    @Input
    public abstract Property<String> getDownloadUrl();

    /**
     * 다운로드 대상 파일
     *
     * @return Gradle 사용자 홈 캐시의 OTD 실행 파일
     */
    @OutputFile
    public abstract RegularFileProperty getDestinationFile();

    /**
     * 다운로드 출처 메타데이터 파일
     * <p>
     * 캐시된 실행 파일이 현재 다운로드 URL에서 생성되었는지 판별하는 데 사용한다.
     *
     * @return 다운로드 출처 URL을 저장하는 메타데이터 파일
     */
    @OutputFile
    public File getSourceMetadataFile() {
        return sourceMetadataPath(getDestinationFile().get().getAsFile().toPath()).toFile();
    }

    /**
     * OTD 실행 파일 다운로드
     * <p>
     * 동일한 대상의 프로세스 및 파일 시스템 간 병렬 다운로드를 직렬화한다. 캐시 출처가
     * 일치하면 기존 파일을 사용하고 Unix 계열 호스트에서는 실행 권한을 설정한다.
     *
     * @throws GradleException 다운로드, 캐시 준비 또는 실행 권한 설정에 실패한 경우
     */
    @TaskAction
    public void download() {
        Path destination = getDestinationFile().get().getAsFile().toPath();
        Path parent = destination.getParent();
        if (parent == null) {
            throw new GradleException("OTD executable destination must have a parent directory");
        }

        String source = getDownloadUrl().get();
        Path sourceMetadata = sourceMetadataPath(destination);
        Path processLockKey = destination.toAbsolutePath().normalize();
        ReentrantLock processLock = PROCESS_LOCKS.computeIfAbsent(processLockKey, ignored -> new ReentrantLock());
        processLock.lock();
        try {
            Files.createDirectories(parent);
            Path lockPath = destination.resolveSibling(destination.getFileName() + ".lock");
            try (FileChannel channel = FileChannel.open(
                            lockPath, StandardOpenOption.CREATE, StandardOpenOption.WRITE);
                    FileLock ignored = channel.lock()) {
                if (isCached(destination, sourceMetadata, source)) {
                    getLogger().info("Using cached OTD executable: {}", destination);
                    markExecutable(destination);
                    return;
                }
                downloadLocked(source, destination, sourceMetadata);
            }
        } catch (IOException error) {
            throw new GradleException("Unable to prepare the OTD executable at " + destination, error);
        } finally {
            processLock.unlock();
        }
    }

    private void downloadLocked(String source, Path destination, Path sourceMetadata) {
        Path temporary = destination.resolveSibling(
                destination.getFileName() + "." + UUID.randomUUID() + ".part");
        getLogger().lifecycle("Downloading OTD executable from {}", source);

        try {
            HttpClient client = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(30))
                    .followRedirects(HttpClient.Redirect.NORMAL)
                    .build();
            HttpRequest request = HttpRequest.newBuilder(URI.create(source))
                    .header("User-Agent", "openapi-to-document-gradle-plugin")
                    .timeout(Duration.ofMinutes(10))
                    .GET()
                    .build();
            HttpResponse<Path> response =
                    client.send(request, HttpResponse.BodyHandlers.ofFile(temporary));

            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new GradleException(
                        "Unable to download the OTD executable: HTTP "
                                + response.statusCode()
                                + " from "
                                + source);
            }
            if (!Files.isRegularFile(temporary) || Files.size(temporary) == 0) {
                throw new GradleException("Downloaded OTD executable is empty: " + source);
            }

            moveIntoPlace(temporary, destination);
            writeSourceMetadata(sourceMetadata, source);
            markExecutable(destination);
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
            throw new GradleException("Interrupted while downloading the OTD executable", error);
        } catch (IOException | IllegalArgumentException error) {
            throw new GradleException("Unable to download the OTD executable from " + source, error);
        } finally {
            try {
                Files.deleteIfExists(temporary);
            } catch (IOException error) {
                getLogger().debug("Unable to delete temporary download {}", temporary, error);
            }
        }
    }

    private static boolean isCached(Path destination, Path sourceMetadata, String source)
            throws IOException {
        return Files.isRegularFile(destination)
                && Files.size(destination) > 0
                && Files.isRegularFile(sourceMetadata)
                && Files.readString(sourceMetadata, StandardCharsets.UTF_8).equals(source);
    }

    private static void writeSourceMetadata(Path sourceMetadata, String source) throws IOException {
        Files.writeString(
                sourceMetadata,
                source,
                StandardCharsets.UTF_8,
                StandardOpenOption.CREATE,
                StandardOpenOption.TRUNCATE_EXISTING,
                StandardOpenOption.WRITE);
    }

    private static Path sourceMetadataPath(Path destination) {
        return destination.resolveSibling(destination.getFileName() + ".source-url");
    }

    private static void moveIntoPlace(Path source, Path destination) throws IOException {
        try {
            Files.move(
                    source,
                    destination,
                    java.nio.file.StandardCopyOption.ATOMIC_MOVE,
                    java.nio.file.StandardCopyOption.REPLACE_EXISTING);
        } catch (AtomicMoveNotSupportedException ignored) {
            Files.move(source, destination, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
        }
    }

    private static void markExecutable(Path executable) {
        String osName = System.getProperty("os.name", "").toLowerCase(Locale.ROOT);
        if (osName.contains("win")) {
            return;
        }
        if (!executable.toFile().setExecutable(true, false) && !Files.isExecutable(executable)) {
            throw new GradleException("Unable to mark the OTD download as executable: " + executable);
        }
    }
}
