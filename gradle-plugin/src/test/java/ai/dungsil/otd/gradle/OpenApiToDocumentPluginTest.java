package ai.dungsil.otd.gradle;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.File;
import java.util.Map;
import java.util.Set;
import org.gradle.api.Project;
import org.gradle.testfixtures.ProjectBuilder;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springdoc.openapi.gradle.plugin.OpenApiExtension;

class OpenApiToDocumentPluginTest {
    @TempDir
    File projectDirectory;

    @Test
    void registersLazyDefaultsWithoutApplyingSpringdoc() {
        Project project = ProjectBuilder.builder().withProjectDir(projectDirectory).build();
        File buildDirectory = project.getLayout().getBuildDirectory().get().getAsFile();

        project.getPluginManager().apply(OpenApiToDocumentPlugin.class);

        OpenApiDocumentExtension extension =
                project.getExtensions().getByType(OpenApiDocumentExtension.class);
        assertEquals("1.0.0", extension.getOtdVersion().get());
        assertEquals(
                new File(buildDirectory, "api-document"),
                extension.getOutputDirectory().get().getAsFile());
        assertInstanceOf(
                GenerateApiDocumentTask.class,
                project.getTasks().getByName(OpenApiToDocumentPlugin.GENERATE_TASK_NAME));
        assertInstanceOf(
                DownloadOtdExecutableTask.class,
                project.getTasks().getByName(OpenApiToDocumentPlugin.DOWNLOAD_TASK_NAME));
    }

    @Test
    void resolvesSingleAndGroupedSpringdocOutputs() {
        Project project = ProjectBuilder.builder().withProjectDir(projectDirectory).build();
        File buildDirectory = project.getLayout().getBuildDirectory().get().getAsFile();
        OpenApiExtension springdoc =
                project.getExtensions().create("openApi", OpenApiExtension.class);
        springdoc.getOutputDir().set(project.getLayout().getBuildDirectory().dir("springdoc"));
        springdoc.getOutputFileName().set("custom.json");

        Set<File> single = SpringdocOutputFiles.from(springdoc).get();
        assertEquals(Set.of(new File(buildDirectory, "springdoc/custom.json")), single);

        springdoc.getGroupedApiMappings().set(Map.of(
                "http://localhost/v3/api-docs/users", "users.json",
                "http://localhost/v3/api-docs/admin", "admin.yaml"));
        Set<File> grouped = SpringdocOutputFiles.from(springdoc).get();
        assertEquals(2, grouped.size());
        assertTrue(grouped.contains(new File(buildDirectory, "springdoc/users.json")));
        assertTrue(grouped.contains(new File(buildDirectory, "springdoc/admin.yaml")));
    }
}
