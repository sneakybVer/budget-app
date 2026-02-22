-- Savings Tracker launcher
-- Opens the backend + frontend and then opens the app in the browser.
--
-- HOW TO BUILD THE .APP:
--   Run  scripts/mac/build-launcher.sh  from the repo root.
--   It compiles this file into ~/Applications/Savings Tracker.app
--   (or wherever you set APP_DEST in that script).

on run
	-- Edit this path if you cloned the repo somewhere else
	set projectPath to (POSIX path of (path to home folder)) & "Library/CloudStorage/Dropbox/Programs/budget_app/budget-app"
	set startScript to projectPath & "/start.sh"
	tell application "Terminal"
		activate
		set win to do script "clear && bash " & quoted form of startScript
		set custom title of win to "Savings Tracker"
	end tell
	delay 5
	open location "http://localhost:5173/progress"
end run
