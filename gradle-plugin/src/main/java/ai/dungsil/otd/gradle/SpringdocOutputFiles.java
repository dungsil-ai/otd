package ai.dungsil.otd.gradle;

import java.io.File;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import org.gradle.api.GradleException;
import org.gradle.api.file.Directory;
import org.gradle.api.provider.Provider;

final class SpringdocOutputFiles {
    private SpringdocOutputFiles() {}

    static Provider<Set<File>> from(Object extension) {
        Provider<Map<String, String>> groupedApiMappings =
                provider(extension, "getGroupedApiMappings");
        Provider<String> outputFileName = provider(extension, "getOutputFileName");
        Provider<Directory> outputDirectory = provider(extension, "getOutputDir");
        Provider<Set<String>> outputNames = groupedApiMappings.zip(
                outputFileName, SpringdocOutputFiles::resolveOutputNames);

        return outputDirectory.zip(outputNames, SpringdocOutputFiles::resolveFiles);
    }

    @SuppressWarnings("unchecked")
    private static <T> Provider<T> provider(Object extension, String getterName) {
        try {
            Object value = extension.getClass().getMethod(getterName).invoke(extension);
            if (value instanceof Provider<?> provider) {
                return (Provider<T>) provider;
            }
            throw new GradleException(
                    "springdoc extension method " + getterName + " did not return a Gradle Provider");
        } catch (ReflectiveOperationException error) {
            throw new GradleException(
                    "springdoc-openapi Gradle plugin is incompatible: missing " + getterName, error);
        }
    }

    private static Set<String> resolveOutputNames(
            Map<String, String> groupedApiMappings, String outputFileName) {
        Set<String> names = new TreeSet<>();
        if (groupedApiMappings.isEmpty()) {
            addName(names, outputFileName);
        } else {
            groupedApiMappings.values().forEach(name -> addName(names, name));
        }
        return names;
    }

    private static void addName(Set<String> names, String name) {
        if (name == null || name.isBlank()) {
            throw new GradleException("springdoc output file names must not be blank");
        }
        names.add(name);
    }

    private static Set<File> resolveFiles(Directory outputDirectory, Set<String> outputNames) {
        Set<File> files = new LinkedHashSet<>();
        for (String outputName : outputNames) {
            files.add(outputDirectory.file(outputName).getAsFile());
        }
        return files;
    }
}
