import groovy.json.JsonSlurper

plugins {
    `java-gradle-plugin`
    `maven-publish`
    id("com.gradle.plugin-publish") version "1.3.1"
}

val packageMetadata = JsonSlurper().parse(file("../package.json")) as Map<*, *>

group = "io.github.dungsil-ai"
version = requireNotNull(packageMetadata["version"]) { "package.json is missing version" }.toString()

repositories {
    mavenCentral()
    gradlePluginPortal()
}

dependencies {
    testImplementation("org.springdoc:springdoc-openapi-gradle-plugin:1.9.0")
    testImplementation(platform("org.junit:junit-bom:5.13.4"))
    testImplementation("org.junit.jupiter:junit-jupiter")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

java {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
    withSourcesJar()
    withJavadocJar()
}

gradlePlugin {
    website = "https://github.com/dungsil-ai/otd"
    vcsUrl = "https://github.com/dungsil-ai/otd.git"

    plugins {
        create("openApiToDocument") {
            id = "io.github.dungsil-ai.openapi-to-document"
            implementationClass = "ai.dungsil.otd.gradle.OpenApiToDocumentPlugin"
            displayName = "OpenAPI to Document"
            description = "Generates XLSX API specification documents from springdoc OpenAPI output"
            tags = listOf("openapi", "springdoc", "xlsx", "documentation")
        }
    }
}

tasks.withType<JavaCompile>().configureEach {
    options.encoding = "UTF-8"
    options.release.set(17)
}

tasks.withType<Test>().configureEach {
    useJUnitPlatform()
}

tasks.processResources {
    val pluginVersion = project.version.toString()
    inputs.property("pluginVersion", pluginVersion)
    filesMatching("otd-plugin.properties") {
        expand("version" to pluginVersion)
    }
}
