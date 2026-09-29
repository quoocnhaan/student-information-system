# ==============================================================================
# Script Kiểm thử Bảo mật & Phân quyền Role-based Access Control (RBAC) với JWT
# Dành cho Academic Service (port 8080) và Activity Service (port 8080/8081)
# ==============================================================================

param(
    [string]$AcademicUrl = "http://localhost:8080/api",
    [string]$ActivityUrl = "http://localhost:8080/api"
)

$adminToken = "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhZG1pbiIsInJvbGUiOiJST0xFX0FETUlOIiwicm9sZXMiOlsiUk9MRV9BRE1JTiJdLCJpYXQiOjE3OTA2NzQ1NTIsImV4cCI6MjEwNjAzNDU1Mn0.4d95Rhj9mIzenP1ME7T9uMABuv1uoLLDH7MOc4nuNq-gkMF7DOf9My7Hq57Kp9N3gUx9zoxBMtbPckv456UisA"
$lecturerToken = "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJsZWN0dXJlcl8wMSIsInJvbGUiOiJST0xFX0xFQ1RVUkVSIiwicm9sZXMiOlsiUk9MRV9MRUNUVVJFUiJdLCJpYXQiOjE3OTA2NzQ1NTMsImV4cCI6MjEwNjAzNDU1M30.dMm39TRGrE9RuZu5O3tMc7r2ukXrTKChe4lZmVUqdCthFe0i2HeeN5OYc0piZnFQISIK_2pq844BZxrh2O5C9Q"
$studentToken = "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJzdHVkZW50XzAxIiwicm9sZSI6IlJPTEVfU1RVREVOVCIsInJvbGVzIjpbIlJPTEVfU1RVREVOVCJdLCJpYXQiOjE3OTA2NzQ1NTMsImV4cCI6MjEwNjAzNDU1M30.QmmEA9Fr6-sLzeUBFoKeroVA19SrkYwFjTXYfw8MRFAaHXTewZbhKOnwCOdOOmiVWsvlunIE972M8mylvgriRg"
$invalidToken = "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJoYWNrZXIifQ.invalidsignature1234567890abcdef"

$tmpFile = [System.IO.Path]::GetTempFileName()

function Request-Api {
    param(
        [string]$Method,
        [string]$Url,
        [string]$JsonBody,
        [string]$Token
    )
    $authArgs = if ($Token) { @("-H", "Authorization: Bearer $Token") } else { @() }
    if ($JsonBody) {
        [System.IO.File]::WriteAllText($tmpFile, $JsonBody, [System.Text.Encoding]::UTF8)
        $resp = curl.exe -s -w "`nHTTP_STATUS:%{http_code}" -X $Method $Url @authArgs -H "Content-Type: application/json" -d "@$tmpFile"
    } else {
        $resp = curl.exe -s -w "`nHTTP_STATUS:%{http_code}" -X $Method $Url @authArgs
    }
    
    $parts = $resp -split "HTTP_STATUS:"
    $body = $parts[0].TrimEnd("`r", "`n")
    $status = if ($parts.Length -gt 1) { $parts[1].Trim() } else { "UNKNOWN" }
    
    return [PSCustomObject]@{
        Status = $status
        Body = $body
    }
}

function Assert-Result {
    param(
        [string]$CaseName,
        $Result,
        [string]$ExpectedStatus
    )
    $pass = ($Result.Status -eq $ExpectedStatus)
    $badge = if ($pass) { "[PASS]" } else { "[FAIL]" }
    $color = if ($pass) { "Green" } else { "Red" }
    
    Write-Host "$badge $CaseName -> Status: $($Result.Status) (Expected: $ExpectedStatus)" -ForegroundColor $color
    if (-not $pass) {
        Write-Host "   Response Body: $($Result.Body)" -ForegroundColor DarkGray
    }
}

Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host ">>> BAT DAU KIEM THU PHAN QUYEN RBAC VOI JWT CO DINH <<<" -ForegroundColor Yellow
Write-Host "====================================================================" -ForegroundColor Cyan

# 1. TEST PUBLIC ENDPOINTS
Write-Host "`n--- 1. KIEM THU PUBLIC ENDPOINTS (PermitAll) ---" -ForegroundColor Blue
$res = Request-Api "GET" "$AcademicUrl/health"
Assert-Result "GET /api/health (Khong token)" $res "200"

$res = Request-Api "GET" "$AcademicUrl/auth/tokens"
Assert-Result "GET /api/auth/tokens (Khong token)" $res "200"

# 2. TEST AUTHENTICATION (401 Unauthorized)
Write-Host "`n--- 2. KIEM THU XAC THUC (401 Unauthorized) ---" -ForegroundColor Blue
$res = Request-Api "GET" "$AcademicUrl/classes"
Assert-Result "GET /api/classes khong co token -> 401" $res "401"

$res = Request-Api "GET" "$AcademicUrl/classes" "" $invalidToken
Assert-Result "GET /api/classes voi token sai chu ky -> 401" $res "401"

# 3. TEST AUTHORIZATION - ACADEMIC SERVICE
Write-Host "`n--- 3. KIEM THU PHAN QUYEN ACADEMIC SERVICE ---" -ForegroundColor Blue
# GET classes: ca 3 role deu doc duoc
$res = Request-Api "GET" "$AcademicUrl/classes" "" $studentToken
Assert-Result "STUDENT doc /api/classes -> 200" $res "200"

# Sinh vien tao khoa/nganh/lop -> 403 Forbidden
$facultyPayload = '{"facultyId":"K_TEST_403","name":"Khoa Test 403"}'
$res = Request-Api "POST" "$AcademicUrl/faculties" $facultyPayload $studentToken
Assert-Result "STUDENT tao Faculty -> 403 Forbidden" $res "403"

# Giang vien tao khoa/nganh/lop -> 403 Forbidden
$res = Request-Api "POST" "$AcademicUrl/faculties" $facultyPayload $lecturerToken
Assert-Result "LECTURER tao Faculty -> 403 Forbidden" $res "403"

# Admin tao khoa -> 201 Created (hoac 200/500 tuy DB record)
$res = Request-Api "POST" "$AcademicUrl/faculties" $facultyPayload $adminToken
Write-Host "   ADMIN tao Faculty Status: $($res.Status)" -ForegroundColor Cyan

# 4. TEST AUTHORIZATION - ACTIVITY SERVICE
Write-Host "`n--- 4. KIEM THU PHAN QUYEN ACTIVITY SERVICE (M-Learning) ---" -ForegroundColor Blue
# Sinh vien tao Section -> 403 Forbidden
$secPayload = '{"name":"Chuong 1","idClasses":"CLASS_TEST_01"}'
$res = Request-Api "POST" "$ActivityUrl/sections" $secPayload $studentToken
Assert-Result "STUDENT tao Section -> 403 Forbidden" $res "403"

# Sinh vien truy cap ngan hang cau hoi /api/questions -> 403 Forbidden
$res = Request-Api "GET" "$ActivityUrl/questions" "" $studentToken
Assert-Result "STUDENT truy cap /api/questions -> 403 Forbidden" $res "403"

# Giang vien truy cap ngan hang cau hoi /api/questions -> 200 OK
$res = Request-Api "GET" "$ActivityUrl/questions" "" $lecturerToken
Assert-Result "LECTURER truy cap /api/questions -> 200 OK" $res "200"

Write-Host "`n====================================================================" -ForegroundColor Cyan
Write-Host ">>> HOAN TAT KIEM THU <<<" -ForegroundColor Yellow
Write-Host "====================================================================" -ForegroundColor Cyan
