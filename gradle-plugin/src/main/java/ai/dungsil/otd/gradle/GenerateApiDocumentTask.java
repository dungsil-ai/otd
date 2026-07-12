package ai.dungsil.otd.gradle;

import java.io.File;
import java.io.IOException;
import java.nio.file.InvalidPathException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
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
import org.gradle.api.tasks.Optional;
import org.gradle.api.tasks.OutputFiles;
import org.gradle.api.tasks.PathSensitive;
import org.gradle.api.tasks.PathSensitivity;
import org.gradle.api.tasks.TaskAction;
import org.gradle.process.ExecOperations;
import org.gradle.work.DisableCachingByDefault;

/** Converts configured OpenAPI inputs into XLSX API specification documents. */
@DisableCachingByDefault(because = "OTD embeds creation metadata in generated workbooks")
public abstract class GenerateApiDocumentTask extends DefaultTask {
    private final ExecOperations execOperations;

    /**
     * Creates the conversion task.
     *
     * @param execOperations Gradle process execution service
     */
    @Inject
    public GenerateApiDocumentTask(ExecOperations execOperations) {
        this.execOperations = execOperations;
    }

    /**
     * Returns the OpenAPI JSON or YAML input files.
     *
     * @return OpenAPI inputs
     */
    @InputFiles
    @PathSensitive(PathSensitivity.RELATIVE)
    public abstract ConfigurableFileCollection getOpenApiFiles();

    /**
     * Returns the directory that receives generated documents.
     *
     * @return output directory
     */
    @Internal
    public abstract DirectoryProperty getOutputDirectory();

    /**
     * Returns an optional output name for a single input.
     *
     * @return optional output file name
     */
    @Internal
    public abstract Property<String> getOutputFileName();

    /**
     * Returns the OTD executable to invoke.
     *
     * @return OTD executable
     */
    @Optional
    @InputFile
    @PathSensitive(PathSensitivity.NONE)
    public abstract RegularFileProperty getOtdExecutable();

    /**
     * Returns arguments inserted before OTD CLI arguments.
     *
     * @return executable prefix arguments
     */
    @Input
    public abstract ListProperty<String> getExecutableArgs();

    /**
     * Returns the XLSX files produced by this task.
     *
     * @return generated documents
     */
    @OutputFiles
    public Set<File> getGeneratedDocuments() {
        return createConversionPlan().values().stream()
                .map(Path::toFile)
                .collect(Collectors.toUnmodifiableSet());
    }

    /** Runs OTD once for each configured OpenAPI input. */
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

        Path outputDirectory = getOutputDirectory().get().getAsFile().toPath();
        try {
            java.nio.file.Files.createDirectories(outputDirectory);
        } catch (IOException error) {
            throw new GradleException("Unable to create output directory " + outputDirectory, error);
        }

        for (Map.Entry<Path, Path> conversion : conversions.entrySet()) {
            runOtd(conversion.getKey(), conversion.getValue());
            Path output = conversion.getValue();
            try {
                if (!java.nio.file.Files.isRegularFile(output)
                        || java.nio.file.Files.size(output) == 0) {
                    throw new GradleException("OTD did not create the expected document: " + output);
                }
            } catch (IOException error) {
                throw new GradleException("Unable to inspect generated document " + output, error);
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
            if (path.isAbsolute() || path.getNameCount() != 1 || name.equals(".") || name.equals("..")) {
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
