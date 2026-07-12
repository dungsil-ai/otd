package ai.dungsil.otd.gradle;

import java.util.Locale;
import org.gradle.api.GradleException;

/** 호스트 플랫폼과 대응하는 OTD 릴리스 자산 */
record HostPlatform(String operatingSystem, String architecture, String assetName) {
    static HostPlatform current() {
        return detect(System.getProperty("os.name", ""), System.getProperty("os.arch", ""));
    }

    /**
     * OS 및 아키텍처 이름 정규화
     *
     * @param osName JVM의 OS 이름
     * @param osArch JVM의 아키텍처 이름
     * @return 지원되는 호스트 플랫폼
     * @throws GradleException 대응하는 릴리스 실행 파일이 없는 경우
     */
    static HostPlatform detect(String osName, String osArch) {
        String normalizedOs = osName.toLowerCase(Locale.ROOT);
        String operatingSystem;
        if (normalizedOs.contains("mac") || normalizedOs.contains("darwin")) {
            operatingSystem = "darwin";
        } else if (normalizedOs.contains("win")) {
            operatingSystem = "windows";
        } else if (normalizedOs.contains("linux")) {
            operatingSystem = "linux";
        } else {
            throw unsupported(osName, osArch);
        }

        String normalizedArch = osArch.toLowerCase(Locale.ROOT);
        String architecture;
        if (normalizedArch.equals("amd64") || normalizedArch.equals("x86_64")) {
            architecture = "x64";
        } else if (normalizedArch.equals("arm64") || normalizedArch.equals("aarch64")) {
            architecture = "arm64";
        } else {
            throw unsupported(osName, osArch);
        }

        if (operatingSystem.equals("windows") && architecture.equals("arm64")) {
            throw unsupported(osName, osArch);
        }

        String suffix = operatingSystem.equals("windows") ? ".exe" : "";
        return new HostPlatform(
                operatingSystem,
                architecture,
                "otd-" + operatingSystem + "-" + architecture + suffix);
    }

    private static GradleException unsupported(String osName, String osArch) {
        return new GradleException(
                "OTD does not provide an executable for os.name='"
                        + osName
                        + "', os.arch='"
                        + osArch
                        + "'. Configure openApiDocument.executable explicitly.");
    }
}
