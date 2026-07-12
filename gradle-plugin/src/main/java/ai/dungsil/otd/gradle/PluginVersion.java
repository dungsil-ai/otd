package ai.dungsil.otd.gradle;

import java.io.IOException;
import java.io.InputStream;
import java.util.Properties;

/** 플러그인 리소스 기반 OTD 버전 조회 */
final class PluginVersion {
    private static final String RESOURCE_NAME = "/otd-plugin.properties";

    private PluginVersion() {}

    /**
     * 배포 버전 로드
     * <p>
     * 빌드 시 필터링된 플러그인 리소스에서 OTD 버전을 읽고 미치환 값을 거부한다.
     *
     * @return 배포된 플러그인의 OTD 버전
     * @throws IllegalStateException 버전 리소스가 없거나 유효하지 않은 경우
     */
    static String load() {
        Properties properties = new Properties();
        try (InputStream stream = PluginVersion.class.getResourceAsStream(RESOURCE_NAME)) {
            if (stream == null) {
                throw new IllegalStateException("Missing " + RESOURCE_NAME);
            }
            properties.load(stream);
        } catch (IOException error) {
            throw new IllegalStateException("Unable to read " + RESOURCE_NAME, error);
        }

        String version = properties.getProperty("version", "").trim();
        if (version.isEmpty() || version.contains("${")) {
            throw new IllegalStateException("Invalid OTD Gradle plugin version: " + version);
        }
        return version;
    }
}
