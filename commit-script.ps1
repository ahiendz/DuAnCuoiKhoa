function Commit-And-Merge {
    param (
        [string]$branchName,
        [string[]]$filesToAdd,
        [string]$commitMesg
    )
    git checkout -b $branchName
    foreach ($file in $filesToAdd) {
        git add $file
    }
    # check if anything is staged (git diff --cached --quiet exits with 1 if there are staged changes)
    git diff --cached --quiet
    if ($LASTEXITCODE -ne 0) {
        git commit -m $commitMesg
        git checkout main
        git merge --no-ff $branchName -m "Merge branch '$branchName'"
    } else {
        Write-Host "No changes to commit for $branchName"
        git checkout main
        git branch -D $branchName
    }
}

git checkout main

Commit-And-Merge -branchName "feature/navbar-scroll-fix" -filesToAdd @("src/components/Navbar.jsx", "src/components/PublicNavbar.jsx", "src/pages/public/Support.jsx", "src/sections/Hero.jsx", "src/index.css") -commitMesg "feat(ui): dynamic navbar background on scroll and style updates"

Commit-And-Merge -branchName "fix/teacher-form-and-sidebar" -filesToAdd @("src/pages/admin/Teachers.jsx", "src/components/Sidebar.jsx") -commitMesg "fix(ui): teacher form validation and sidebar header alignment"

Commit-And-Merge -branchName "refactor/school-management-system" -filesToAdd @("src/App.jsx", "src/layouts/", "src/components/DashboardNavLinks.jsx", "src/components/UserMenu.jsx") -commitMesg "refactor(core): restructure layout components and routing"

Commit-And-Merge -branchName "feature/attendance-reconstruction" -filesToAdd @("backend/services/attendanceService.js", "src/services/attendanceService.js", "src/pages/admin/Attendance.jsx", "src/pages/public/Attendance.jsx", "backend/face/") -commitMesg "feat(attendance): high-precision face recognition flow and connectivity"

Commit-And-Merge -branchName "feature/ai-chat-updates" -filesToAdd @("backend/services/gemini.service.js", "list_models_new.js") -commitMesg "feat(ai): refactor AI chat flow with structured JSON and Gemini API integration"

Commit-And-Merge -branchName "feature/student-class-management" -filesToAdd @("src/pages/admin/Students.jsx", "src/pages/admin/Classes.jsx", "src/pages/teacher/Classes.jsx", "src/services/studentService.js", "backend/services/studentService.js", "convert_gender_values.js", "server.js") -commitMesg "feat(students): update student and class management APIs and UI"

Commit-And-Merge -branchName "chore/misc-updates" -filesToAdd @("src/pages/parent/Notifications.jsx", "components/", "public/", "test-theme.js", "test/", "debug_analytics.js", ".gitignore", "node_modules/.package-lock.json") -commitMesg "chore: test scripts, public assets, and miscellaneous tooling updates"

git checkout -b feat/remaining-updates
git add .
git diff --cached --quiet
if ($LASTEXITCODE -ne 0) {
    git commit -m "chore(cleanup): commit any remaining uncommitted changes"
    git checkout main
    git merge --no-ff feat/remaining-updates -m "Merge branch 'feat/remaining-updates'"
} else {
    git checkout main
    git branch -D feat/remaining-updates
}

git push origin main
