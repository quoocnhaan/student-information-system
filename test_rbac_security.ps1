# ==============================================================================
# Script Kiểm thử Bảo mật & Phân quyền Role-based Access Control (RBAC) với JWT
# Dành cho Academic Service (port 8080) và Activity Service (port 8080/8081)
# ==============================================================================

param(
    [string]$AcademicUrl = "http://localhost:8080/api",
    [string]$ActivityUrl = "http://localhost:8080/api"
)

$adminToken = "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhZG1pbiIsInJvbGUiOiJST0xFX0FETUlOIiwicm9sZXMiOlsiUk9MRV9BRE1JTiJdLCJpYXQiOjE3OTA4MjA4NzMsImV4cCI6MTc5MDgzNTI3M30.8CZYueaEZc7I3Ov9CNJyZjhsP70csSQ1Czn4zXkn1A2ay7awN-p4lz8IxqNm3W08asR6GR7VMbHFGCRwlNt5AA"
$lecturerToken = "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJsZWN0dXJlcl8wMSIsInJvbGUiOiJST0xFX0xFQ1RVUkVSIiwicm9sZXMiOlsiUk9MRV9MRUNUVVJFUiJdLCJpYXQiOjE3OTA4MjA4NzMsImV4cCI6MTc5MDgzNTI3M30.DCSj6nkrO6bRqbGFWfCtfnAXFkwPM__CT2Xsp0_7PrUgpRe1YSjlNckw9idPdfKhWmoCY-2hB89cGHC3Q9lNow"
$studentToken = "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJzdHVkZW50XzAxIiwicm9sZSI6IlJPTEVfU1RVREVOVCIsInJvbGVzIjpbIlJPTEVfU1RVREVOVCJdLCJpYXQiOjE3OTA4MjA4NzMsImV4cCI6MTc5MDgzNTI3M30.dF1BwE8QaAuNoEJFygSexDPsIJtZLFjdi0r827Fj9ROa8IRYHTunj3xBrM1PMdfHjivmhLNEGfXBOILvAuG-rQ"
$invalidToken = "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJoYWNrZXIifQ.invalidsignature1234567890abcdef"

$tmpFile = [System.IO.Path]::GetTempFileName()

function Request-Api {
    param(
        [string]$Method,
        [string]$Url,
        [string]$JsonBody,
        [string]$Token,
        [string]$ContentType = "application/json"
    )
    $authArgs = if ($Token) { @("-H", "Authorization: Bearer $Token") } else { @() }
    if ($JsonBody) {
        [System.IO.File]::WriteAllText($tmpFile, $JsonBody, [System.Text.Encoding]::UTF8)
        $resp = curl.exe -s -w "`nHTTP_STATUS:%{http_code}" -X $Method $Url @authArgs -H "Content-Type: $ContentType" -d "@$tmpFile"
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

$academicRoot = $AcademicUrl -replace '/api/?$', ''
$activityRoot = $ActivityUrl -replace '/api/?$', ''
$res = Request-Api "GET" "$academicRoot/health"
Assert-Result "GET /health Academic (Khong token) (A-003, A-410)" $res "200"
$res = Request-Api "GET" "$activityRoot/health"
Assert-Result "GET /health Activity (Khong token) (V-003, V-472)" $res "200"

$res = Request-Api "GET" "$AcademicUrl/auth/tokens"
Assert-Result "GET /api/auth/tokens (Dev Helper)" $res "200"
if ($res.Status -eq "200") {
    try {
        $toks = $res.Body | ConvertFrom-Json
        if ($toks.adminToken) { $adminToken = $toks.adminToken }
        if ($toks.lecturerToken) { $lecturerToken = $toks.lecturerToken }
        if ($toks.studentToken) { $studentToken = $toks.studentToken }
        Write-Host "   -> Da lay token moi tu Dev Helper thanh cong" -ForegroundColor Cyan
    } catch {}
}

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

# Sinh vien tao dap an /api/options (V-173) -> 403 Forbidden
$optPayload = '{"idQuestion":"07f38b5e-0852-4dfa-bd6c-872af947f522","answer":"dap an do sinh vien chen","correct":true}'
$res = Request-Api "POST" "$ActivityUrl/options" $optPayload $studentToken
Assert-Result "STUDENT tao dap an /api/options (V-173) -> 403 Forbidden" $res "403"

# Sinh vien xem dap an theo cau hoi /api/options/by-question (V-174) -> 403 Forbidden
$res = Request-Api "GET" "$ActivityUrl/options/by-question/07f38b5e-0852-4dfa-bd6c-872af947f522" "" $studentToken
Assert-Result "STUDENT xem dap an /api/options/by-question (V-174) -> 403 Forbidden" $res "403"

# Sinh vien truy cap /api/options -> 403 Forbidden
$res = Request-Api "GET" "$ActivityUrl/options" "" $studentToken
Assert-Result "STUDENT truy cap /api/options -> 403 Forbidden" $res "403"

# Giang vien truy cap /api/options -> 200 OK
$res = Request-Api "GET" "$ActivityUrl/options" "" $lecturerToken
Assert-Result "LECTURER truy cap /api/options -> 200 OK" $res "200"

# 5. TEST STUDENT DATA OWNERSHIP (F-05)
Write-Host "`n--- 5. KIEM THU QUYEN SO HUU DU LIEU SINH VIEN (F-05) ---" -ForegroundColor Blue
# A-151: STUDENT student_01 dang ky hoc phan thay student_99 -> 403 Forbidden
$enrPayload = '{"enrollmentId":"TEN_TEST_403","studentId":"student_99","idClasses":"TCL2201511"}'
$res = Request-Api "POST" "$AcademicUrl/student-enrollments" $enrPayload $studentToken
Assert-Result "STUDENT dang ky hoc phan thay sv khac (A-151) -> 403 Forbidden" $res "403"

# A-154: STUDENT student_01 xem diem cua student_02 -> 403 Forbidden
$res = Request-Api "GET" "$AcademicUrl/student-scores/TSC2201511" "" $studentToken
Assert-Result "STUDENT xem diem sv khac (A-154) -> 403 Forbidden" $res "403"

# V-171: STUDENT student_01 tao luot lam bai cho student_99 -> 403 Forbidden
$attPayload = '{"idQuiz":"6b279ce8-c116-4589-bc4e-5746986ca6b5","idStudent":"student_99","attemptNumber":1}'
$res = Request-Api "POST" "$ActivityUrl/attempts" $attPayload $studentToken
Assert-Result "STUDENT tao luot lam bai cho sv khac (V-171) -> 403 Forbidden" $res "403"

# V-172: STUDENT student_01 nop bai tap thay student_99 -> 403 Forbidden
$subPayload = '{"idAssignment":"6b279ce8-c116-4589-bc4e-5746986ca6b5","idStudent":"student_99","submitFile":"file.pdf"}'
$res = Request-Api "POST" "$ActivityUrl/assignment-student-approves" $subPayload $studentToken
Assert-Result "STUDENT nop bai tap thay sv khac (V-172) -> 403 Forbidden" $res "403"

# 6. TEST QUIZ GRADING SECURITY (F-03)
Write-Host "`n--- 6. KIEM THU TU CHAM DIEM TRAC NGHIEM (F-03) ---" -ForegroundColor Blue
# V-169: STUDENT tao luot lam bai kem grade=10 -> grade phai la null hoac bi tu choi (201/400/403)
$v169Payload = '{"idQuiz":"6b279ce8-c116-4589-bc4e-5746986ca6b5","idStudent":"student_01","attemptNumber":1,"startTime":"2026-10-05T09:00:00","grade":10}'
$res = Request-Api "POST" "$ActivityUrl/attempts" $v169Payload $studentToken
$v169Pass = $false
if ($res.Status -eq "201") {
    $resObj = $res.Body | ConvertFrom-Json
    $v169Pass = ($null -eq $resObj.grade)
} elseif ($res.Status -in @("400", "403")) {
    $v169Pass = $true
}
$badge = if ($v169Pass) { "[PASS]" } else { "[FAIL]" }
$color = if ($v169Pass) { "Green" } else { "Red" }
Write-Host "$badge STUDENT tao luot lam bai kem grade=10 (V-169) -> Status: $($res.Status) (grade null hoac 400/403)" -ForegroundColor $color
if (-not $v169Pass) { Write-Host "   Response Body: $($res.Body)" -ForegroundColor DarkGray }

# V-170: STUDENT tu sua grade=10 qua PUT luot lam bai -> grade phai tinh tu answers (khong duoc 10.0)
$v170Payload = '{"idQuiz":"6b279ce8-c116-4589-bc4e-5746986ca6b5","idStudent":"student_01","attemptNumber":1,"startTime":"2026-10-05T09:00:00","finishedTime":"2026-10-05T09:25:00","grade":10}'
$res = Request-Api "PUT" "$ActivityUrl/attempts/9aeb71e5-52bc-4734-9077-a7f76f638539" $v170Payload $studentToken
$v170Pass = $false
if ($res.Status -eq "200") {
    $resObj = $res.Body | ConvertFrom-Json
    $v170Pass = ($resObj.grade -ne 10.0 -and $resObj.grade -ne 10)
} elseif ($res.Status -in @("400", "403", "404")) {
    $v170Pass = $true
}
$badge = if ($v170Pass) { "[PASS]" } else { "[FAIL]" }
$color = if ($v170Pass) { "Green" } else { "Red" }
Write-Host "$badge STUDENT tu sua grade=10 qua PUT (V-170) -> Status: $($res.Status) (grade != 10.0 hoac 400/403/404)" -ForegroundColor $color
if (-not $v170Pass) { Write-Host "   Response Body: $($res.Body)" -ForegroundColor DarkGray }

# Giang vien / Admin sua grade qua PATCH /api/attempts/{id}/grade -> chi LECTURER/ADMIN
$res = Request-Api "PATCH" "$ActivityUrl/attempts/9aeb71e5-52bc-4734-9077-a7f76f638539/grade?grade=9.5" "" $studentToken
Assert-Result "STUDENT goi PATCH /api/attempts/{id}/grade -> 403 Forbidden" $res "403"

# V-188: LECTURER goi PATCH /api/attempts/{id}/grade khong truyen diem -> 400 Bad Request
$res = Request-Api "PATCH" "$ActivityUrl/attempts/9aeb71e5-52bc-4734-9077-a7f76f638539/grade" "" $lecturerToken
Assert-Result "PATCH /grade khong truyen diem (V-188) -> 400 Bad Request" $res "400"

# 7. TEST STUDENT ENROLLMENT GRADING SECURITY (F-04)
Write-Host "`n--- 7. KIEM THU TU GIE DIEM KHI DANG KY HOC PHAN (F-04) ---" -ForegroundColor Blue
# A-152: STUDENT tu dang ky kem finalScore=10, letterGrade=A, isPassed=true -> cac truong diem phai la null
$a152Payload = '{"enrollmentId":"TEN_TEST_F04","studentId":"student_01","idClasses":"TCL2201511","finalScore":10,"letterGrade":"A","isPassed":true}'
$res = Request-Api "POST" "$AcademicUrl/student-enrollments" $a152Payload $studentToken
$a152Pass = $false
if ($res.Status -eq "201") {
    $resObj = $res.Body | ConvertFrom-Json
    $a152Pass = ($null -eq $resObj.finalScore -and $null -eq $resObj.letterGrade -and $null -eq $resObj.isPassed)
} elseif ($res.Status -in @("400", "403")) {
    $a152Pass = $true
}
$badge = if ($a152Pass) { "[PASS]" } else { "[FAIL]" }
$color = if ($a152Pass) { "Green" } else { "Red" }
Write-Host "$badge STUDENT tu dang ky kem finalScore=10 (A-152) -> Status: $($res.Status) (score/grade/pass phai null hoac 400/403)" -ForegroundColor $color
if (-not $a152Pass) { Write-Host "   Response Body: $($res.Body)" -ForegroundColor DarkGray }

# Sinh vien cap nhat luot dang ky qua PUT -> 403 Forbidden
$res = Request-Api "PUT" "$AcademicUrl/student-enrollments/TEN_TEST_F04" $a152Payload $studentToken
Assert-Result "STUDENT sua student-enrollments qua PUT -> 403 Forbidden" $res "403"

# A-054: STUDENT dang ky hoc phan khong truyen enrollmentStatus -> server gan ENROLLED
$a054Payload = '{"enrollmentId":"TEN_TEST_A054","studentId":"student_01","idClasses":"TCL2201511"}'
$res = Request-Api "POST" "$AcademicUrl/student-enrollments" $a054Payload $studentToken
$a054Pass = $false
if ($res.Status -eq "201") {
    $resObj = $res.Body | ConvertFrom-Json
    $a054Pass = ($resObj.enrollmentStatus -eq "ENROLLED")
}
$badge = if ($a054Pass) { "[PASS]" } else { "[FAIL]" }
$color = if ($a054Pass) { "Green" } else { "Red" }
Write-Host "$badge STUDENT dang ky hoc phan co enrollmentStatus=ENROLLED (A-054) -> Status: $($res.Status) (Status: $(if($a054Pass){'ENROLLED'}else{'null/khac'}))" -ForegroundColor $color
if (-not $a054Pass) { Write-Host "   Response Body: $($res.Body)" -ForegroundColor DarkGray }

# 8. TEST STUDENT ANSWER CONSISTENCY (F-07)
Write-Host "`n--- 8. KIEM THU TINH NHAT QUAN CUA CAU TRA LOI (F-07) ---" -ForegroundColor Blue
# V-175: Tra loi bang dap an thuoc cau hoi khac -> 400/409/422
$v175Payload = '{"idAttempt":"9aeb71e5-52bc-4734-9077-a7f76f638539","idQuestion":"dfb27ade-9530-478a-b368-9276e4da300a","idOption":"fac7189e-e1f4-4791-bb67-726a998fbbe4"}'
$res = Request-Api "POST" "$ActivityUrl/student-answers" $v175Payload $studentToken
$v175Pass = ($res.Status -in @("400", "404", "409", "422"))
$badge = if ($v175Pass) { "[PASS]" } else { "[FAIL]" }
$color = if ($v175Pass) { "Green" } else { "Red" }
Write-Host "$badge Tra loi bang dap an cua cau hoi khac (V-175) -> Status: $($res.Status) (Expected: 400/409/422)" -ForegroundColor $color
if (-not $v175Pass) { Write-Host "   Response Body: $($res.Body)" -ForegroundColor DarkGray }

# V-176: Cau hoi khong thuoc bai trac nghiem cua luot lam bai -> 400/409/422
$v176Payload = '{"idAttempt":"9aeb71e5-52bc-4734-9077-a7f76f638539","idQuestion":"07f38b5e-0852-4dfa-bd6c-872af947f522"}'
$res = Request-Api "POST" "$ActivityUrl/student-answers" $v176Payload $studentToken
$v176Pass = ($res.Status -in @("400", "404", "409", "422"))
$badge = if ($v176Pass) { "[PASS]" } else { "[FAIL]" }
$color = if ($v176Pass) { "Green" } else { "Red" }
Write-Host "$badge Cau hoi khong thuoc quiz cua attempt (V-176) -> Status: $($res.Status) (Expected: 400/409/422)" -ForegroundColor $color
if (-not $v176Pass) { Write-Host "   Response Body: $($res.Body)" -ForegroundColor DarkGray }

# 9. TEST VALUE VALIDATION IN ACTIVITY SERVICE (F-11)
Write-Host "`n--- 9. KIEM THU VALIDATION GIA TRI ACTIVITY SERVICE (F-11) ---" -ForegroundColor Blue

# V-178: Ngay dong truoc ngay mo (timeClose < timeOpen) -> 400 Bad Request
$v178Payload = '{"name":"Bai giang invalid date","idSection":"sec_01","type":"QUIZ","timeOpen":"2026-10-10","timeClose":"2026-10-05"}'
$res = Request-Api "POST" "$ActivityUrl/activities" $v178Payload $lecturerToken
Assert-Result "timeClose truoc timeOpen (V-178) -> 400 Bad Request" $res "400"

# V-179: Gio ket thuc truoc gio bat dau (finishedTime < startTime) -> 400 Bad Request
$v179Payload = '{"idQuiz":"6b279ce8-c116-4589-bc4e-5746986ca6b5","idStudent":"student_01","attemptNumber":1,"startTime":"2026-10-05T10:00:00","finishedTime":"2026-10-05T09:00:00"}'
$res = Request-Api "POST" "$ActivityUrl/attempts" $v179Payload $studentToken
Assert-Result "finishedTime truoc startTime (V-179) -> 400 Bad Request" $res "400"

# V-180: Thoi luong quiz am (duration = -10) -> 400 Bad Request
$v180Payload = '{"idActivity":"89074f76-8d2d-4b7a-9213-9c8aca84d95f","description":"x","duration":-10}'
$res = Request-Api "POST" "$ActivityUrl/quizzes" $v180Payload $lecturerToken
Assert-Result "Thoi luong quiz am duration=-10 (V-180) -> 400 Bad Request" $res "400"

# V-181: attemptsLimit am (attemptsLimit = -1) -> 400 Bad Request
$v181Payload = '{"idActivity":"89074f76-8d2d-4b7a-9213-9c8aca84d95f","description":"x","duration":30,"attemptsLimit":-1}'
$res = Request-Api "POST" "$ActivityUrl/quizzes" $v181Payload $lecturerToken
Assert-Result "So lan lam bai am attemptsLimit=-1 (V-181) -> 400 Bad Request" $res "400"

# V-186: Diem am hoac > 10.0 (grade = -1.0 hoac 11.0) -> 400 Bad Request
$v186Payload = '{"idQuiz":"6b279ce8-c116-4589-bc4e-5746986ca6b5","idStudent":"student_01","attemptNumber":1,"startTime":"2026-10-05T09:00:00","grade":-1.0}'
$res = Request-Api "POST" "$ActivityUrl/attempts" $v186Payload $lecturerToken
Assert-Result "Diem am grade=-1.0 (V-186) -> 400 Bad Request" $res "400"

# V-187: fileUrl khong phai URL hop le -> 400 Bad Request
$v187Payload = '{"idActivity":"89074f76-8d2d-4b7a-9213-9c8aca84d95f","description":"file invalid","fileUrl":"invalid-file-url"}'
$res = Request-Api "POST" "$ActivityUrl/files" $v187Payload $lecturerToken
Assert-Result "fileUrl khong hop le (V-187) -> 400 Bad Request" $res "400"

# 10. TEST DUPLICATE CLASSES (F-10)
Write-Host "`n--- 10. KIEM THU TRUNG MA LOP CLASSES (F-10) ---" -ForegroundColor Blue
# V-160: Tao lai lop da ton tai (trung idClasses) -> 409 Conflict
$v160Payload = '{"idClasses":"TEST_CLASS_01"}'
$res = Request-Api "POST" "$ActivityUrl/classes" $v160Payload $adminToken
Assert-Result "Tao lop trung idClasses (V-160) -> 409 Conflict" $res "409"

# 11. TEST CLIENT ERROR HANDLING & INFORMATION DISCLOSURE (F-09)
Write-Host "`n--- 11. KIEM THU LOI CLIENT VA CHONG LO THONG TIN NOI BO (F-09) ---" -ForegroundColor Blue

# A-173: Id dang so nhung truyen chu (/api/exam-students/abc) -> 400 Bad Request
$res = Request-Api "GET" "$AcademicUrl/exam-students/abc" "" $adminToken
Assert-Result "Id dang so nhung truyen chu (A-173) -> 400 Bad Request" $res "400"

# A-178: Method khong ho tro (PATCH /api/faculties) -> 405 Method Not Allowed
$res = Request-Api "PATCH" "$AcademicUrl/faculties" '{"name":"test"}' $adminToken
Assert-Result "Method khong ho tro PATCH (A-178) -> 405 Method Not Allowed" $res "405"

# A-179: Duong dan khong ton tai (/api/khong-ton-tai-201511) -> 404 Not Found
$res = Request-Api "GET" "$AcademicUrl/khong-ton-tai-201511" "" $adminToken
Assert-Result "Duong dan khong ton tai (A-179) -> 404 Not Found" $res "404"

# A-180: Content-Type sai (text/plain) -> 415 Unsupported Media Type
$res = Request-Api "POST" "$AcademicUrl/faculties" "plain-text-payload" $adminToken "text/plain"
Assert-Result "Content-Type sai (A-180) -> 415 Unsupported Media Type" $res "415"

# 12. TEST DATABASE CONSTRAINT & INTEGRITY VIOLATIONS (F-08)
Write-Host "`n--- 12. KIEM THU RANG BUOC CSDL & VI PHAM TOAN VEN (F-08) ---" -ForegroundColor Blue

# V-161: Tao quiz thu hai cho cung activity -> 400 hoac 409
$v161Payload = '{"idActivity":"e3309437-9ec9-4d3f-a71a-5fed70d1eda2","description":"Quiz trung","duration":10}'
$res = Request-Api "POST" "$ActivityUrl/quizzes" $v161Payload $lecturerToken
$v161Pass = ($res.Status -in @("400", "409"))
$badge = if ($v161Pass) { "[PASS]" } else { "[FAIL]" }
$color = if ($v161Pass) { "Green" } else { "Red" }
Write-Host "$badge Tao quiz thu hai cho cung activity (V-161) -> Status: $($res.Status) (Expected: 400 hoac 409)" -ForegroundColor $color
if (-not $v161Pass) { Write-Host "   Response Body: $($res.Body)" -ForegroundColor DarkGray }

# V-185: Ten chuong muc dai hon 255 ky tu -> 400 Bad Request
$longName = "A" * 256
$v185Payload = '{"name":"' + $longName + '","idClasses":"TEST_CLASS_01"}'
$res = Request-Api "POST" "$ActivityUrl/sections" $v185Payload $lecturerToken
Assert-Result "Ten section dai hon 255 ky tu (V-185) -> 400 Bad Request" $res "400"

# V-190: Xoa lop dang co chuong muc tham chieu -> 409 Conflict
$res = Request-Api "DELETE" "$ActivityUrl/classes/TEST_CLASS_01" "" $adminToken
Assert-Result "Xoa lop dang co section tham chieu (V-190) -> 409 Conflict" $res "409"

Write-Host "`n====================================================================" -ForegroundColor Cyan
Write-Host ">>> HOAN TAT KIEM THU <<<" -ForegroundColor Yellow
Write-Host "====================================================================" -ForegroundColor Cyan




