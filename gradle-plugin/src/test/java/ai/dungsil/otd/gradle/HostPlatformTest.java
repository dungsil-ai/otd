package ai.dungsil.otd.gradle;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.gradle.api.GradleException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class HostPlatformTest {
    @DisplayName("배포 대상 OS와 아키텍처를 릴리스 자산명으로 변환한다")
    @Test
    void shouldBeResolvedForAllPublishedReleaseTargets() {
        assertEquals(
                "otd-windows-x64.exe",
                HostPlatform.detect("Windows 11", "amd64").assetName());
        assertEquals("otd-linux-x64", HostPlatform.detect("Linux", "x86_64").assetName());
        assertEquals("otd-linux-arm64", HostPlatform.detect("Linux", "aarch64").assetName());
        assertEquals("otd-darwin-x64", HostPlatform.detect("Mac OS X", "x86_64").assetName());
        assertEquals("otd-darwin-arm64", HostPlatform.detect("Darwin", "arm64").assetName());
    }

    @DisplayName("지원하지 않는 Windows ARM64를 거부한다")
    @Test
    void shouldBeThrownWhenReleaseExecutableIsUnavailable() {
        GradleException error = assertThrows(
                GradleException.class,
                () -> HostPlatform.detect("Windows 11", "aarch64"));

        assertTrue(error.getMessage().contains("openApiDocument.executable"));
    }

    @DisplayName("알 수 없는 OS와 아키텍처를 거부한다")
    @Test
    void shouldBeThrownWhenOperatingSystemOrArchitectureIsUnknown() {
        assertAll(
                () -> assertThrows(
                        GradleException.class, () -> HostPlatform.detect("FreeBSD", "amd64")),
                () -> assertThrows(
                        GradleException.class, () -> HostPlatform.detect("Linux", "riscv64")));
    }
}
