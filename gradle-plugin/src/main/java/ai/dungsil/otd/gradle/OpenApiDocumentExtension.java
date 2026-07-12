package ai.dungsil.otd.gradle;

import org.gradle.api.file.ConfigurableFileCollection;
import org.gradle.api.file.DirectoryProperty;
import org.gradle.api.file.RegularFileProperty;
import org.gradle.api.provider.ListProperty;
import org.gradle.api.provider.Property;

/** Springdoc OpenAPI 출력의 XLSX 변환 설정 */
public abstract class OpenApiDocumentExtension {
    /** 확장 생성 */
    public OpenApiDocumentExtension() {}

    /**
     * OpenAPI JSON 또는 YAML 입력 반환
     * <p>
     * Springdoc 플러그인이 적용되면 해당 출력 파일을 자동으로 추가한다.
     *
     * @return 구성 가능한 OpenAPI 입력
     */
    public abstract ConfigurableFileCollection getOpenApiFiles();

    /**
     * 생성 XLSX 문서의 출력 디렉터리 반환
     *
     * @return 출력 디렉터리
     */
    public abstract DirectoryProperty getOutputDirectory();

    /**
     * 단일 OpenAPI 입력에 사용할 선택적 출력 파일명 반환
     *
     * @return 선택적 출력 파일명
     */
    public abstract Property<String> getOutputFileName();

    /**
     * 사용자 지정 OTD 실행 파일 반환
     * <p>
     * 값을 구성하지 않으면 현재 호스트와 일치하는 릴리스 실행 파일을 사용한다.
     *
     * @return 사용자 지정 OTD 실행 파일
     */
    public abstract RegularFileProperty getExecutable();

    /**
     * 실행 파일과 OTD CLI 인수 사이에 삽입할 인수 반환
     *
     * @return 실행 접두 인수
     */
    public abstract ListProperty<String> getExecutableArgs();

    /**
     * 기본 실행 파일 다운로드에 사용할 OTD 릴리스 버전 반환
     *
     * @return OTD 릴리스 버전
     */
    public abstract Property<String> getOtdVersion();

    /**
     * 버전별 OTD 릴리스 디렉터리를 포함하는 기본 URL 반환
     *
     * @return 릴리스 다운로드 기본 URL
     */
    public abstract Property<String> getDownloadBaseUrl();
}
