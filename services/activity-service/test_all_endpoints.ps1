$baseUrl = "http://localhost:8080/api"
$tmpFile = [System.IO.Path]::GetTempFileName()

function Invoke-CurlJson {
    param(
        [string]$Method,
        [string]$Url,
        [string]$JsonBody
    )
    if ($JsonBody) {
        [System.IO.File]::WriteAllText($tmpFile, $JsonBody, [System.Text.Encoding]::UTF8)
        $resp = curl.exe -s -w "\nHTTP_STATUS:%{http_code}" -X $Method $Url -H "Content-Type: application/json" -d "@$tmpFile"
    } else {
        $resp = curl.exe -s -w "\nHTTP_STATUS:%{http_code}" -X $Method $Url
    }
    
    $parts = $resp -split "HTTP_STATUS:"
    $body = $parts[0].TrimEnd("`r", "`n")
    $status = if ($parts.Length -gt 1) { $parts[1].Trim() } else { "UNKNOWN" }
    
    return [PSCustomObject]@{
        Status = $status
        Body = $body
    }
}

function Log-Test {
    param([string]$Title, $Result)
    Write-Host "====================================================" -ForegroundColor Cyan
    Write-Host "[TEST] $Title" -ForegroundColor Yellow
    $color = if ($Result.Status -like "2*") { "Green" } else { "Red" }
    Write-Host "Status Code: $($Result.Status)" -ForegroundColor $color
    Write-Host "Response Body: $($Result.Body)"
}

try {
    Write-Host ">>> BAT DAU TEST FULL API BANG CURL <<<`n" -ForegroundColor Magenta

    # 1. CLASSES API
    Write-Host "--- 1. TEST /api/classes ---" -ForegroundColor Blue
    $classPayload = '{"idClasses":"CLASS_TEST_01"}'
    $res = Invoke-CurlJson "POST" "$baseUrl/classes" $classPayload
    Log-Test "POST /api/classes (Create)" $res

    $res = Invoke-CurlJson "GET" "$baseUrl/classes/CLASS_TEST_01"
    Log-Test "GET /api/classes/CLASS_TEST_01 (GetById)" $res

    $res = Invoke-CurlJson "GET" "$baseUrl/classes"
    Log-Test "GET /api/classes (GetAll)" $res


    # 2. SECTION API
    Write-Host "`n--- 2. TEST /api/sections ---" -ForegroundColor Blue
    $secPayload = '{"name":"Chương 1: Giới thiệu môn học","idClasses":"CLASS_TEST_01"}'
    $res = Invoke-CurlJson "POST" "$baseUrl/sections" $secPayload
    Log-Test "POST /api/sections (Create)" $res
    $secJson = $res.Body | ConvertFrom-Json
    $secId = $secJson.idSection

    $res = Invoke-CurlJson "GET" "$baseUrl/sections/$secId"
    Log-Test "GET /api/sections/$secId (GetById)" $res

    $res = Invoke-CurlJson "GET" "$baseUrl/sections/by-classes/CLASS_TEST_01"
    Log-Test "GET /api/sections/by-classes/CLASS_TEST_01 (GetByClasses)" $res

    $res = Invoke-CurlJson "GET" "$baseUrl/sections"
    Log-Test "GET /api/sections (GetAll)" $res

    $secUpdatePayload = "{`"name`":`"Chương 1: Tổng quan môn học (Đã cập nhật)`",`"idClasses`":`"CLASS_TEST_01`"}"
    $res = Invoke-CurlJson "PUT" "$baseUrl/sections/$secId" $secUpdatePayload
    Log-Test "PUT /api/sections/$secId (Update)" $res


    # 3. ACTIVITY API
    Write-Host "`n--- 3. TEST /api/activities ---" -ForegroundColor Blue
    # Tạo Activity 1 cho Assignment
    $act1Payload = "{`"name`":`"Hoạt động bài tập tuần 1`",`"idSection`":`"$secId`",`"type`":`"ASSIGNMENT`",`"timeOpen`":`"2026-09-01`",`"timeClose`":`"2026-09-30`"}"
    $res = Invoke-CurlJson "POST" "$baseUrl/activities" $act1Payload
    Log-Test "POST /api/activities (Create Activity 1 - Assignment)" $res
    $act1Json = $res.Body | ConvertFrom-Json
    $actId1 = $act1Json.idActivity

    # Tạo Activity 2 cho Quiz
    $act2Payload = "{`"name`":`"Hoạt động kiểm tra 15 phút`",`"idSection`":`"$secId`",`"type`":`"QUIZ`",`"timeOpen`":`"2026-09-01`",`"timeClose`":`"2026-09-30`"}"
    $res = Invoke-CurlJson "POST" "$baseUrl/activities" $act2Payload
    Log-Test "POST /api/activities (Create Activity 2 - Quiz)" $res
    $act2Json = $res.Body | ConvertFrom-Json
    $actId2 = $act2Json.idActivity

    $res = Invoke-CurlJson "GET" "$baseUrl/activities/$actId1"
    Log-Test "GET /api/activities/$actId1 (GetById)" $res

    $res = Invoke-CurlJson "GET" "$baseUrl/activities/by-section/$secId"
    Log-Test "GET /api/activities/by-section/$secId (GetBySection)" $res

    $res = Invoke-CurlJson "GET" "$baseUrl/activities"
    Log-Test "GET /api/activities (GetAll)" $res

    $actUpdatePayload = "{`"name`":`"Hoạt động bài tập tuần 1 (Cập nhật)`",`"idSection`":`"$secId`",`"type`":`"ASSIGNMENT`",`"timeOpen`":`"2026-09-01`",`"timeClose`":`"2026-10-15`"}"
    $res = Invoke-CurlJson "PUT" "$baseUrl/activities/$actId1" $actUpdatePayload
    Log-Test "PUT /api/activities/$actId1 (Update)" $res


    # 4. ASSIGNMENT API
    Write-Host "`n--- 4. TEST /api/assignments ---" -ForegroundColor Blue
    $assignPayload = "{`"name`":`"Bài tập về nhà số 1`",`"fileTeacher`":`"https://example.com/de-bai-1.pdf`",`"idActivity`":`"$actId1`",`"description`":`"Nộp file source code dạng zip`"}"
    $res = Invoke-CurlJson "POST" "$baseUrl/assignments" $assignPayload
    Log-Test "POST /api/assignments (Create)" $res
    $assignJson = $res.Body | ConvertFrom-Json
    $assignId = $assignJson.idAssignment

    $res = Invoke-CurlJson "GET" "$baseUrl/assignments/$assignId"
    Log-Test "GET /api/assignments/$assignId (GetById)" $res

    $res = Invoke-CurlJson "GET" "$baseUrl/assignments/by-activity/$actId1"
    Log-Test "GET /api/assignments/by-activity/$actId1 (GetByActivity)" $res

    $res = Invoke-CurlJson "GET" "$baseUrl/assignments"
    Log-Test "GET /api/assignments (GetAll)" $res

    $assignUpdatePayload = "{`"name`":`"Bài tập về nhà số 1 (Đã gia hạn)`",`"fileTeacher`":`"https://example.com/de-bai-1-v2.pdf`",`"idActivity`":`"$actId1`",`"description`":`"Gia hạn nộp thêm 3 ngày`"}"
    $res = Invoke-CurlJson "PUT" "$baseUrl/assignments/$assignId" $assignUpdatePayload
    Log-Test "PUT /api/assignments/$assignId (Update)" $res


    # 5. ASSIGNMENT STUDENT APPROVE API
    Write-Host "`n--- 5. TEST /api/assignment-student-approves ---" -ForegroundColor Blue
    $apprPayload = "{`"idAssignment`":`"$assignId`",`"idStudent`":`"SV_2026_001`",`"submitFile`":`"https://example.com/bai-lam-sv001.zip`"}"
    $res = Invoke-CurlJson "POST" "$baseUrl/assignment-student-approves" $apprPayload
    Log-Test "POST /api/assignment-student-approves (Create)" $res
    $apprJson = $res.Body | ConvertFrom-Json
    $apprId = $apprJson.idAssignmentStudentApprove

    $res = Invoke-CurlJson "GET" "$baseUrl/assignment-student-approves/$apprId"
    Log-Test "GET /api/assignment-student-approves/$apprId (GetById)" $res

    $res = Invoke-CurlJson "GET" "$baseUrl/assignment-student-approves/by-assignment/$assignId"
    Log-Test "GET /api/assignment-student-approves/by-assignment/$assignId (GetByAssignment)" $res

    $res = Invoke-CurlJson "GET" "$baseUrl/assignment-student-approves/by-student/SV_2026_001"
    Log-Test "GET /api/assignment-student-approves/by-student/SV_2026_001 (GetByStudent)" $res

    $res = Invoke-CurlJson "GET" "$baseUrl/assignment-student-approves"
    Log-Test "GET /api/assignment-student-approves (GetAll)" $res

    $apprUpdatePayload = "{`"idAssignment`":`"$assignId`",`"idStudent`":`"SV_2026_001`",`"submitFile`":`"https://example.com/bai-lam-sv001-fix.zip`"}"
    $res = Invoke-CurlJson "PUT" "$baseUrl/assignment-student-approves/$apprId" $apprUpdatePayload
    Log-Test "PUT /api/assignment-student-approves/$apprId (Update)" $res


    # 6. FILE API
    Write-Host "`n--- 6. TEST /api/files ---" -ForegroundColor Blue
    $filePayload = "{`"idActivity`":`"$actId1`",`"description`":`"Slide bài giảng chương 1`",`"fileUrl`":`"https://example.com/slide-chuong-1.pptx`"}"
    $res = Invoke-CurlJson "POST" "$baseUrl/files" $filePayload
    Log-Test "POST /api/files (Create)" $res
    $fileJson = $res.Body | ConvertFrom-Json
    $fileId = $fileJson.idFile

    $res = Invoke-CurlJson "GET" "$baseUrl/files/$fileId"
    Log-Test "GET /api/files/$fileId (GetById)" $res

    $res = Invoke-CurlJson "GET" "$baseUrl/files/by-activity/$actId1"
    Log-Test "GET /api/files/by-activity/$actId1 (GetByActivity)" $res

    $res = Invoke-CurlJson "GET" "$baseUrl/files"
    Log-Test "GET /api/files (GetAll)" $res

    $fileUpdatePayload = "{`"idActivity`":`"$actId1`",`"description`":`"Slide bài giảng chương 1 (Bản PDF)`",`"fileUrl`":`"https://example.com/slide-chuong-1.pdf`"}"
    $res = Invoke-CurlJson "PUT" "$baseUrl/files/$fileId" $fileUpdatePayload
    Log-Test "PUT /api/files/$fileId (Update)" $res


    # 7. QUIZ API
    Write-Host "`n--- 7. TEST /api/quizzes ---" -ForegroundColor Blue
    $quizPayload = "{`"idActivity`":`"$actId2`",`"description`":`"Bài kiểm tra trắc nghiệm 15 phút`",`"duration`":15,`"attemptsLimit`":2}"
    $res = Invoke-CurlJson "POST" "$baseUrl/quizzes" $quizPayload
    Log-Test "POST /api/quizzes (Create)" $res
    $quizJson = $res.Body | ConvertFrom-Json
    $quizId = $quizJson.idQuiz

    $res = Invoke-CurlJson "GET" "$baseUrl/quizzes/$quizId"
    Log-Test "GET /api/quizzes/$quizId (GetById)" $res

    $res = Invoke-CurlJson "GET" "$baseUrl/quizzes/by-activity/$actId2"
    Log-Test "GET /api/quizzes/by-activity/$actId2 (GetByActivity)" $res

    $res = Invoke-CurlJson "GET" "$baseUrl/quizzes"
    Log-Test "GET /api/quizzes (GetAll)" $res

    $quizUpdatePayload = "{`"idActivity`":`"$actId2`",`"description`":`"Bài kiểm tra 20 phút (Đã chỉnh sửa)`",`"duration`":20,`"attemptsLimit`":3}"
    $res = Invoke-CurlJson "PUT" "$baseUrl/quizzes/$quizId" $quizUpdatePayload
    Log-Test "PUT /api/quizzes/$quizId (Update)" $res


    # 8. QUESTION API
    Write-Host "`n--- 8. TEST /api/questions ---" -ForegroundColor Blue
    $qPayload = "{`"idQuiz`":`"$quizId`",`"title`":`"Java có hỗ trợ đa kế thừa qua class không?`"}"
    $res = Invoke-CurlJson "POST" "$baseUrl/questions" $qPayload
    Log-Test "POST /api/questions (Create)" $res
    $qJson = $res.Body | ConvertFrom-Json
    $questionId = $qJson.idQuestion

    $res = Invoke-CurlJson "GET" "$baseUrl/questions/$questionId"
    Log-Test "GET /api/questions/$questionId (GetById)" $res

    $res = Invoke-CurlJson "GET" "$baseUrl/questions/by-quiz/$quizId"
    Log-Test "GET /api/questions/by-quiz/$quizId (GetByQuiz)" $res

    $res = Invoke-CurlJson "GET" "$baseUrl/questions"
    Log-Test "GET /api/questions (GetAll)" $res

    $qUpdatePayload = "{`"idQuiz`":`"$quizId`",`"title`":`"Java có hỗ trợ đa kế thừa qua interface không?`"}"
    $res = Invoke-CurlJson "PUT" "$baseUrl/questions/$questionId" $qUpdatePayload
    Log-Test "PUT /api/questions/$questionId (Update)" $res


    # 9. QUESTION OPTION API
    Write-Host "`n--- 9. TEST /api/options ---" -ForegroundColor Blue
    $opt1Payload = "{`"idQuestion`":`"$questionId`",`"answer`":`"Có, Java hỗ trợ đa kế thừa interface`",`"correct`":true}"
    $res = Invoke-CurlJson "POST" "$baseUrl/options" $opt1Payload
    Log-Test "POST /api/options (Create Option 1 - Correct)" $res
    $opt1Json = $res.Body | ConvertFrom-Json
    $optionId1 = $opt1Json.idOption

    $opt2Payload = "{`"idQuestion`":`"$questionId`",`"answer`":`"Không bao giờ`",`"correct`":false}"
    $res = Invoke-CurlJson "POST" "$baseUrl/options" $opt2Payload
    Log-Test "POST /api/options (Create Option 2 - Incorrect)" $res
    $opt2Json = $res.Body | ConvertFrom-Json
    $optionId2 = $opt2Json.idOption

    $res = Invoke-CurlJson "GET" "$baseUrl/options/$optionId1"
    Log-Test "GET /api/options/$optionId1 (GetById)" $res

    $res = Invoke-CurlJson "GET" "$baseUrl/options/by-question/$questionId"
    Log-Test "GET /api/options/by-question/$questionId (GetByQuestion)" $res

    $res = Invoke-CurlJson "GET" "$baseUrl/options"
    Log-Test "GET /api/options (GetAll)" $res

    $optUpdatePayload = "{`"idQuestion`":`"$questionId`",`"answer`":`"Có, Java hoàn toàn hỗ trợ (Chính xác)`",`"correct`":true}"
    $res = Invoke-CurlJson "PUT" "$baseUrl/options/$optionId1" $optUpdatePayload
    Log-Test "PUT /api/options/$optionId1 (Update)" $res


    # 10. ATTEMPT API
    Write-Host "`n--- 10. TEST /api/attempts ---" -ForegroundColor Blue
    $attPayload = "{`"idQuiz`":`"$quizId`",`"idStudent`":`"SV_2026_001`",`"attemptNumber`":1,`"startTime`":`"2026-09-28T09:00:00`",`"finishedTime`":`"2026-09-28T09:15:00`",`"grade`":9.5}"
    $res = Invoke-CurlJson "POST" "$baseUrl/attempts" $attPayload
    Log-Test "POST /api/attempts (Create)" $res
    $attJson = $res.Body | ConvertFrom-Json
    $attemptId = $attJson.idAttempt

    $res = Invoke-CurlJson "GET" "$baseUrl/attempts/$attemptId"
    Log-Test "GET /api/attempts/$attemptId (GetById)" $res

    $res = Invoke-CurlJson "GET" "$baseUrl/attempts/by-quiz/$quizId"
    Log-Test "GET /api/attempts/by-quiz/$quizId (GetByQuiz)" $res

    $res = Invoke-CurlJson "GET" "$baseUrl/attempts/by-student/SV_2026_001"
    Log-Test "GET /api/attempts/by-student/SV_2026_001 (GetByStudent)" $res

    $res = Invoke-CurlJson "GET" "$baseUrl/attempts"
    Log-Test "GET /api/attempts (GetAll)" $res

    $attUpdatePayload = "{`"idQuiz`":`"$quizId`",`"idStudent`":`"SV_2026_001`",`"attemptNumber`":1,`"startTime`":`"2026-09-28T09:00:00`",`"finishedTime`":`"2026-09-28T09:14:30`",`"grade`":10.0}"
    $res = Invoke-CurlJson "PUT" "$baseUrl/attempts/$attemptId" $attUpdatePayload
    Log-Test "PUT /api/attempts/$attemptId (Update)" $res


    # 11. STUDENT ANSWER API
    Write-Host "`n--- 11. TEST /api/student-answers ---" -ForegroundColor Blue
    $ansPayload = "{`"idAttempt`":`"$attemptId`",`"idQuestion`":`"$questionId`",`"idOption`":`"$optionId1`"}"
    $res = Invoke-CurlJson "POST" "$baseUrl/student-answers" $ansPayload
    Log-Test "POST /api/student-answers (Create)" $res
    $ansJson = $res.Body | ConvertFrom-Json
    $ansId = $ansJson.idSa

    $res = Invoke-CurlJson "GET" "$baseUrl/student-answers/$ansId"
    Log-Test "GET /api/student-answers/$ansId (GetById)" $res

    $res = Invoke-CurlJson "GET" "$baseUrl/student-answers/by-attempt/$attemptId"
    Log-Test "GET /api/student-answers/by-attempt/$attemptId (GetByAttempt)" $res

    $res = Invoke-CurlJson "GET" "$baseUrl/student-answers"
    Log-Test "GET /api/student-answers (GetAll)" $res

    $ansUpdatePayload = "{`"idAttempt`":`"$attemptId`",`"idQuestion`":`"$questionId`",`"idOption`":`"$optionId2`"}"
    $res = Invoke-CurlJson "PUT" "$baseUrl/student-answers/$ansId" $ansUpdatePayload
    Log-Test "PUT /api/student-answers/$ansId (Update)" $res


    # 12. TEST DELETE APIS (Xoa theo trật tự phụ thuộc đảo ngược)
    Write-Host "`n--- 12. TEST DELETE CHO CAC API ---" -ForegroundColor Blue

    $res = Invoke-CurlJson "DELETE" "$baseUrl/student-answers/$ansId"
    Log-Test "DELETE /api/student-answers/$ansId" $res

    $res = Invoke-CurlJson "DELETE" "$baseUrl/attempts/$attemptId"
    Log-Test "DELETE /api/attempts/$attemptId" $res

    $res = Invoke-CurlJson "DELETE" "$baseUrl/options/$optionId1"
    Log-Test "DELETE /api/options/$optionId1" $res

    $res = Invoke-CurlJson "DELETE" "$baseUrl/options/$optionId2"
    Log-Test "DELETE /api/options/$optionId2" $res

    $res = Invoke-CurlJson "DELETE" "$baseUrl/questions/$questionId"
    Log-Test "DELETE /api/questions/$questionId" $res

    $res = Invoke-CurlJson "DELETE" "$baseUrl/quizzes/$quizId"
    Log-Test "DELETE /api/quizzes/$quizId" $res

    $res = Invoke-CurlJson "DELETE" "$baseUrl/files/$fileId"
    Log-Test "DELETE /api/files/$fileId" $res

    $res = Invoke-CurlJson "DELETE" "$baseUrl/assignment-student-approves/$apprId"
    Log-Test "DELETE /api/assignment-student-approves/$apprId" $res

    $res = Invoke-CurlJson "DELETE" "$baseUrl/assignments/$assignId"
    Log-Test "DELETE /api/assignments/$assignId" $res

    $res = Invoke-CurlJson "DELETE" "$baseUrl/activities/$actId2"
    Log-Test "DELETE /api/activities/$actId2" $res

    $res = Invoke-CurlJson "DELETE" "$baseUrl/activities/$actId1"
    Log-Test "DELETE /api/activities/$actId1" $res

    $res = Invoke-CurlJson "DELETE" "$baseUrl/sections/$secId"
    Log-Test "DELETE /api/sections/$secId" $res

    $res = Invoke-CurlJson "DELETE" "$baseUrl/classes/CLASS_TEST_01"
    Log-Test "DELETE /api/classes/CLASS_TEST_01" $res

    Write-Host "`n>>> HOAN TAT TEST TOAN BO 11 MODULE API (CRUD) THANH CONG! <<<" -ForegroundColor Green

} finally {
    if (Test-Path $tmpFile) {
        Remove-Item -Force $tmpFile
    }
}
