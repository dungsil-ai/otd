package ai.dungsil.otd.gradle;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.gradle.api.GradleException;
import org.junit.jupiter.api.Test;

class HostPlatformTest {
    @Test
    void resolvesAllPublishedReleaseTargets() {
        assertEquals(
                "otd-windows-x64.exe",
                HostPlatform.detect("Windows 11", "amd64").assetName());
        assertEquals("otd-linux-x64", HostPlatform.detect("Linux", "x86_64").assetName());
        assertEquals("otd-linux-arm64", HostPlatform.detect("Linux", "aarch64").assetName());
        assertEquals("otd-darwin-x64", HostPlatform.detect("Mac OS X", "x86_64").assetName());
        assertEquals("otd-darwin-arm64", HostPlatform.detect("Darwin", "arm64").assetName());
    }

    @Test
    void rejectsTargetsWithoutAReleaseExecutable() {
        GradleException error = assertThrows(
                GradleException.class,
                () -> HostPlatform.detect("Windows 11", "aarch64"));

        assertTrue(error.getMessage().contains("openApiDocument.executable"));
    }
}
