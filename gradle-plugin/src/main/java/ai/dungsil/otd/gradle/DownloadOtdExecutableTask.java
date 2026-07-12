package ai.dungsil.otd.gradle;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.channels.FileChannel;
import java.nio.channels.FileLock;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.time.Duration;
import java.util.UUID;
import org.gradle.api.DefaultTask;
import org.gradle.api.GradleException;
import org.gradle.api.file.RegularFileProperty;
import org.gradle.api.provider.Property;
import org.gradle.api.tasks.Input;
import org.gradle.api.tasks.OutputFile;
import org.gradle.api.tasks.TaskAction;
import org.gradle.work.DisableCachingByDefault;

/** Downloads one platform-specific OTD executable into a managed cache location. */
@DisableCachingByDefault(because = "The executable is stored in the shared Gradle user home cache")
public abstract class DownloadOtdExecutableTask extends DefaultTask {
    /** Creates the download task. */
    public DownloadOtdExecutableTask() {}

    /**
     * Returns the release asset URL.
     *
     * @return executable download URL
     */
    @Input
    public abstract Property<String> getDownloadUrl();

    /**
     * Returns the local executable path.
     *
     * @return downloaded executable
     */
    @OutputFile
    public abstract RegularFileProperty getDestinationFile();

    /** Downloads the executable atomically and marks it executable on Unix hosts. */
    @TaskAction
    public void download() {
        Path destination = getDestinationFile().get().getAsFile().toPath();
        Path parent = destination.getParent();
        if (parent == null) {
            throw new GradleException("OTD executable destination must have a parent directory");
        }

        try {
            Files.createDirectories(parent);
            Path lockPath = destination.resolveSibling(destination.getFileName() + ".lock");
            try (FileChannel channel = FileChannel.open(
                            lockPath, StandardOpenOption.CREATE, StandardOpenOption.WRITE);
                    FileLock ignored = channel.lock()) {
                if (Files.isRegularFile(destination) && Files.size(destination) > 0) {
                    getLogger().info("Using cached OTD executable: {}", destination);
                    markExecutable(destination);
                    return;
                }
                downloadLocked(destination);
            }
        } catch (IOException error) {
            throw new GradleException("Unable to prepare the OTD executable at " + destination, error);
        }
    }

    private void downloadLocked(Path destination) {
        String source = getDownloadUrl().get();
        Path temporary = destination.resolveSibling(
                destination.getFileName() + "." + UUID.randomUUID() + ".part");
        getLogger().lifecycle("Downloading OTD executable from {}", source);

        try {
            HttpClient client = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(30))
                    .followRedirects(HttpClient.Redirect.ALWAYS)
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
        if (HostPlatform.current().operatingSystem().equals("windows")) {
            return;
        }
        if (!executable.toFile().setExecutable(true, false) && !Files.isExecutable(executable)) {
            throw new GradleException("Unable to mark the OTD download as executable: " + executable);
        }
    }
}
