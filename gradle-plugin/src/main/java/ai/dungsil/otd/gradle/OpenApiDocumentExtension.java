package ai.dungsil.otd.gradle;

import org.gradle.api.file.ConfigurableFileCollection;
import org.gradle.api.file.DirectoryProperty;
import org.gradle.api.file.RegularFileProperty;
import org.gradle.api.provider.ListProperty;
import org.gradle.api.provider.Property;

/** Configuration for converting springdoc OpenAPI output into XLSX documents. */
public abstract class OpenApiDocumentExtension {
    /** Creates the extension. */
    public OpenApiDocumentExtension() {}

    /**
     * Returns the OpenAPI JSON or YAML inputs. Springdoc output is added automatically.
     *
     * @return configurable OpenAPI inputs
     */
    public abstract ConfigurableFileCollection getOpenApiFiles();

    /**
     * Returns the directory that receives generated XLSX documents.
     *
     * @return output directory
     */
    public abstract DirectoryProperty getOutputDirectory();

    /**
     * Returns the optional output file name, which is valid only for one OpenAPI input.
     *
     * @return optional output file name
     */
    public abstract Property<String> getOutputFileName();

    /**
     * Returns the OTD executable. The matching release executable is used by default.
     *
     * @return OTD executable
     */
    public abstract RegularFileProperty getExecutable();

    /**
     * Returns arguments inserted between the executable and OTD CLI arguments.
     *
     * @return executable prefix arguments
     */
    public abstract ListProperty<String> getExecutableArgs();

    /**
     * Returns the OTD release version used for the default executable download.
     *
     * @return OTD release version
     */
    public abstract Property<String> getOtdVersion();

    /**
     * Returns the base URL containing versioned OTD release directories.
     *
     * @return release download base URL
     */
    public abstract Property<String> getDownloadBaseUrl();
}
