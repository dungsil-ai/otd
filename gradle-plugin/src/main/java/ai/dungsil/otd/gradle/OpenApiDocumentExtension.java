package ai.dungsil.otd.gradle;

import org.gradle.api.file.ConfigurableFileCollection;
import org.gradle.api.file.DirectoryProperty;
import org.gradle.api.file.RegularFileProperty;
import org.gradle.api.provider.ListProperty;
import org.gradle.api.provider.Property;

/** OpenAPI 문서 변환 설정 */
public abstract class OpenApiDocumentExtension {
    /** 변환 설정 생성 */
    public OpenApiDocumentExtension() {}

    /**
     * OpenAPI 입력 파일
     * <p>
     * Springdoc 플러그인이 적용되면 단일 또는 그룹별 출력 파일을 자동으로 추가한다.
     *
     * @return 구성 가능한 OpenAPI JSON 또는 YAML 파일 모음
     */
    public abstract ConfigurableFileCollection getOpenApiFiles();

    /**
     * 생성 문서 출력 디렉터리
     * <p>
     * 기본값은 프로젝트 빌드 디렉터리의 {@code api-document} 하위 디렉터리다.
     *
     * @return XLSX 문서 출력 디렉터리
     */
    public abstract DirectoryProperty getOutputDirectory();

    /**
     * 단일 입력의 출력 파일명
     * <p>
     * 입력이 하나일 때만 설정할 수 있다. 확장자가 없으면 {@code .xlsx}를 추가하며
     * 경로는 허용하지 않는다.
     *
     * @return 선택적 XLSX 출력 파일명
     */
    public abstract Property<String> getOutputFileName();

    /**
     * 사용자 지정 OTD 실행 파일
     * <p>
     * 값을 설정하지 않으면 현재 호스트용 릴리스 실행 파일을 Gradle 사용자 홈 캐시에
     * 다운로드한다.
     *
     * @return 선택적 OTD 실행 파일
     */
    public abstract RegularFileProperty getExecutable();

    /**
     * OTD 실행 접두 인수
     * <p>
     * 실행 파일 경로 뒤, OTD CLI 인수 앞에 삽입한다. 기본값은 빈 목록이다.
     *
     * @return 실행 접두 인수
     */
    public abstract ListProperty<String> getExecutableArgs();

    /**
     * 관리형 OTD 릴리스 버전
     * <p>
     * 기본값은 플러그인 배포 버전이다.
     *
     * @return OTD 릴리스 버전
     */
    public abstract Property<String> getOtdVersion();

    /**
     * OTD 릴리스 다운로드 기본 URL
     * <p>
     * 버전 태그와 플랫폼별 자산명을 결합해 관리형 실행 파일 다운로드 URL을 구성한다.
     *
     * @return 릴리스 다운로드 기본 URL
     */
    public abstract Property<String> getDownloadBaseUrl();
}
