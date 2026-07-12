package ai.dungsil.otd.gradle;

import java.io.IOException;
import java.io.InputStream;
import java.util.Properties;

/** 필터링된 플러그인 리소스에서 OTD 버전 조회 */
final class PluginVersion {
    private static final String RESOURCE_NAME = "/otd-plugin.properties";

    private PluginVersion() {}

    /**
     * 플러그인 버전 로드
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
