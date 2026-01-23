#[tauri::command]
pub fn my_custom_command() -> String {
    format!("I was invoked from JavaScript!")
}
