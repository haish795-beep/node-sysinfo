# sysinfo.js

Node.js로 내 컴퓨터의 모든 정보를 터미널에 출력하는 스크립트.  
외부 라이브러리 없이 Node.js 기본 모듈만 사용합니다.

## 출력 항목

| 섹션 | 내용 |
|------|------|
| SYSTEM | 컴퓨터 이름, OS, CPU, 메모리, 가동 시간 |
| DISK USAGE | 드라이브별 총/사용/남은 용량 + 바 차트 |
| NETWORK | 네트워크 인터페이스 및 IP 주소 |
| TOP N LARGEST FILES | 지정 경로에서 가장 큰 파일 목록 |
| EXTENSION STATS | 확장자별 점유 용량 순위 |
| CPU LOAD AVERAGE | 1 / 5 / 15분 평균 부하 |

## 사용법

```bash
# 기본 실행 (홈 디렉토리 스캔, 상위 5개 파일)
node sysinfo.js

# 스캔 경로 지정
node sysinfo.js --scan /Users/yourname/Documents

# 상위 파일 개수 변경
node sysinfo.js --top 20

# 조합
node sysinfo.js --scan /home --top 10
```

## 요구 사항

- Node.js 14 이상
- 외부 패키지 없음

## 지원 OS

| OS | 디스크 명령 |
|----|------------|
| macOS / Linux | `df -k` |
| Windows | `wmic logicaldisk` |
