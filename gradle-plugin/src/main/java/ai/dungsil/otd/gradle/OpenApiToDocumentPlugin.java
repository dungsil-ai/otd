package ai.dungsil.otd.gradle;

import java.io.File;
import java.util.Collections;
import java.util.Set;
import org.gradle.api.Plugin;
import org.gradle.api.Project;
import org.gradle.api.Task;
import org.gradle.api.file.RegularFile;
import org.gradle.api.provider.Provider;
import org.gradle.api.tasks.TaskProvider;

/** Wires springdoc OpenAPI generation to OTD XLSX conversion. */
public final class OpenApiToDocumentPlugin implements Plugin<Project> {
    static final String EXTENSION_NAME = "openApiDocument";
    static final String GENERATE_TASK_NAME = "generateApiDocument";
    static final String DOWNLOAD_TASK_NAME = "downloadOtdExecutable";
    static final String SPRINGDOC_PLUGIN_ID = "org.springdoc.openapi-gradle-plugin";
    static final String SPRINGDOC_EXTENSION_NAME = "openApi";
    static final String SPRINGDOC_TASK_NAME = "generateOpenApiDocs";

    private static final String TASK_GROUP = "OpenApi";
    private static final String DEFAULT_DOWNLOAD_BASE_URL =
            "https://github.com/dungsil-ai/otd/releases/download";

    /** Creates the plugin. */
    public OpenApiToDocumentPlugin() {}

    @Override
    public void apply(Project project) {
        OpenApiDocumentExtension extension = project.getExtensions()
                .create(EXTENSION_NAME, OpenApiDocumentExtension.class);
        extension.getOutputDirectory().convention(project.getLayout().getBuildDirectory().dir("api-document"));
        extension.getExecutableArgs().convention(Collections.emptyList());
        extension.getOtdVersion().convention(PluginVersion.load());
        extension.getDownloadBaseUrl().convention(DEFAULT_DOWNLOAD_BASE_URL);

        Provider<HostPlatform> hostPlatform = project.getProviders().provider(HostPlatform::current);
        Provider<String> assetName = hostPlatform.map(HostPlatform::assetName);
        Provider<String> downloadUrl = extension.getDownloadBaseUrl()
                .zip(extension.getOtdVersion(), OpenApiToDocumentPlugin::versionedReleaseUrl)
                .zip(assetName, (releaseUrl, asset) -> releaseUrl + "/" + asset);
        Provider<File> cachedExecutableFile = extension.getOtdVersion().zip(
                assetName,
                (version, asset) -> new File(
                        project.getGradle().getGradleUserHomeDir(),
                        "caches/openapi-to-document/"
                                + cacheSegment(version)
                                + "/"
                                + asset));
        Provider<RegularFile> cachedExecutable = project.getLayout().file(cachedExecutableFile);
        extension.getExecutable().convention(cachedExecutable);

        TaskProvider<DownloadOtdExecutableTask> downloadTask = project.getTasks().register(
                DOWNLOAD_TASK_NAME,
                DownloadOtdExecutableTask.class,
                task -> {
                    task.setGroup(TASK_GROUP);
                    task.setDescription("Downloads the OTD executable for this operating system");
                    task.getDownloadUrl().convention(downloadUrl);
                    task.getDestinationFile().convention(cachedExecutable);
                    task.onlyIf(
                            "the managed OTD executable is selected and OpenAPI inputs are configured",
                            ignored -> shouldDownload(extension, task));
                });

        TaskProvider<GenerateApiDocumentTask> generateTask = project.getTasks().register(
                GENERATE_TASK_NAME,
                GenerateApiDocumentTask.class,
                task -> {
                    task.setGroup(TASK_GROUP);
                    task.setDescription(
                            "Generates XLSX API specification documents from springdoc OpenAPI output");
                    task.getOpenApiFiles().from(extension.getOpenApiFiles());
                    task.getOutputDirectory().convention(extension.getOutputDirectory());
                    task.getOutputFileName().convention(extension.getOutputFileName());
                    task.getOtdExecutable().convention(extension.getExecutable());
                    task.getExecutableArgs().convention(extension.getExecutableArgs());
                    task.dependsOn(downloadTask);
                });

        project.getPluginManager().withPlugin(
                SPRINGDOC_PLUGIN_ID,
                ignored -> wireSpringdoc(project, extension, generateTask));
    }

    private static void wireSpringdoc(
            Project project,
            OpenApiDocumentExtension extension,
            TaskProvider<GenerateApiDocumentTask> generateTask) {
        Object springdoc = project.getExtensions().getByName(SPRINGDOC_EXTENSION_NAME);
        Provider<Set<File>> outputs = SpringdocOutputFiles.from(springdoc);
        TaskProvider<Task> springdocTask = project.getTasks().named(SPRINGDOC_TASK_NAME);

        extension.getOpenApiFiles().from(outputs);
        extension.getOpenApiFiles().builtBy(springdocTask);
        generateTask.configure(task -> task.dependsOn(springdocTask));
    }

    private static boolean shouldDownload(
            OpenApiDocumentExtension extension, DownloadOtdExecutableTask task) {
        if (extension.getOpenApiFiles().isEmpty()) {
            return false;
        }
        File selected = extension.getExecutable().get().getAsFile();
        File managed = task.getDestinationFile().get().getAsFile();
        return selected.toPath().toAbsolutePath().normalize().equals(
                managed.toPath().toAbsolutePath().normalize());
    }

    private static String versionedReleaseUrl(String baseUrl, String version) {
        String normalizedBase = baseUrl.replaceFirst("/+$", "");
        String tag = version.startsWith("v") ? version : "v" + version;
        return normalizedBase + "/" + tag;
    }

    private static String cacheSegment(String version) {
        return version.replaceAll("[^A-Za-z0-9._-]", "_");
    }
}
