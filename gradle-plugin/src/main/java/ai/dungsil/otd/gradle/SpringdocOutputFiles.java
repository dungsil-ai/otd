package ai.dungsil.otd.gradle;

import java.io.File;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import org.gradle.api.GradleException;
import org.gradle.api.Project;
import org.gradle.api.file.Directory;
import org.gradle.api.provider.Provider;

/** Springdoc 설정 기반 OpenAPI 출력 파일 조회 */
final class SpringdocOutputFiles {
    private SpringdocOutputFiles() {}

    /**
     * Springdoc 출력 파일 Provider 생성
     * <p>
     * 그룹 매핑이 있으면 각 그룹의 출력 파일을 사용하고, 없으면 단일 출력 파일을 사용한다.
     *
     * @param project Springdoc 플러그인이 적용된 Gradle 프로젝트
     * @param extension Springdoc OpenAPI 확장 객체
     * @return 단일 또는 그룹별 OpenAPI 출력 파일 Provider
     * @throws GradleException Springdoc 확장 API가 호환되지 않거나 출력 이름이 유효하지 않은 경우
     */
    static Provider<Set<File>> from(Project project, Object extension) {
        Provider<Map<String, String>> groupedApiMappings =
                SpringdocOutputFiles.<Map<String, String>>provider(extension, "getGroupedApiMappings")
                        .orElse(Map.of());
        Provider<String> outputFileName =
                SpringdocOutputFiles.<String>provider(extension, "getOutputFileName")
                        .orElse("openapi.json");
        Provider<Directory> outputDirectory =
                SpringdocOutputFiles.<Directory>provider(extension, "getOutputDir")
                        .orElse(project.getLayout().getBuildDirectory());
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
