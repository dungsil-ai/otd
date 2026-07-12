package ai.dungsil.otd.gradle;

import java.io.IOException;
import java.io.InputStream;
import java.util.Properties;

final class PluginVersion {
    private static final String RESOURCE_NAME = "/otd-plugin.properties";

    private PluginVersion() {}

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
