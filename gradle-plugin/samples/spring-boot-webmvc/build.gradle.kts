plugins {
    java
    id("org.springframework.boot") version "3.5.16"
    id("org.springdoc.openapi-gradle-plugin") version "1.9.0"
    id("io.github.dungsil-ai.openapi-to-document")
}

group = "ai.dungsil.otd.samples"
version = "1.0.0"

java {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
}

repositories {
    mavenCentral()
}

dependencies {
    implementation(platform("org.springframework.boot:spring-boot-dependencies:3.5.16"))
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springdoc:springdoc-openapi-starter-webmvc-api:2.8.17")
}

openApi {
    outputDir.set(layout.buildDirectory.dir("openapi"))
    outputFileName.set("openapi.json")
    waitTimeInSeconds.set(30)
}

openApiDocument {
    outputDirectory.set(layout.buildDirectory.dir("api-specification"))
    outputFileName.set("sample-api.xlsx")
}
