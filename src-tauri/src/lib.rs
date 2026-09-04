// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use base64::{engine::general_purpose, Engine as _};
use enigo::{Enigo, Key, Keyboard, Settings};
use std::fs;
use std::process::Command;
use std::str::FromStr;
use std::sync::Mutex;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::{Emitter, Manager};
use tauri_plugin_clipboard_manager::ClipboardExt;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};
use uuid::Uuid;

mod commands;

struct AppState {
    main_shortcut: Mutex<String>,
    input_translate_shortcut: Mutex<String>,
    selection_translate_shortcut: Mutex<String>,
    screenshot_translate_shortcut: Mutex<String>,
}

#[tauri::command]
fn update_shortcuts(
    app: tauri::AppHandle,
    main_shortcut: String,
    input_translate_shortcut: String,
    selection_translate_shortcut: String,
    screenshot_translate_shortcut: String,
    state: tauri::State<AppState>,
) -> Result<(), String> {
    let shortcut_manager = app.global_shortcut();

    // Unregister all existing shortcuts
    let _ = shortcut_manager.unregister_all();

    // Update state
    *state.main_shortcut.lock().unwrap() = main_shortcut.clone();
    *state.input_translate_shortcut.lock().unwrap() = input_translate_shortcut.clone();
    *state.selection_translate_shortcut.lock().unwrap() = selection_translate_shortcut.clone();
    *state.screenshot_translate_shortcut.lock().unwrap() = screenshot_translate_shortcut.clone();

    // Register main shortcut
    if !main_shortcut.is_empty() {
        if let Ok(shortcut) = Shortcut::from_str(&main_shortcut) {
            let _ = shortcut_manager.register(shortcut);
        }
    }

    // Register input translate shortcut
    if !input_translate_shortcut.is_empty() {
        if let Ok(shortcut) = Shortcut::from_str(&input_translate_shortcut) {
            let _ = shortcut_manager.register(shortcut);
        }
    }

    // Register selection translate shortcut
    if !selection_translate_shortcut.is_empty() {
        if let Ok(shortcut) = Shortcut::from_str(&selection_translate_shortcut) {
            let _ = shortcut_manager.register(shortcut);
        }
    }

    // Register screenshot translate shortcut
    if !screenshot_translate_shortcut.is_empty() {
        if let Ok(shortcut) = Shortcut::from_str(&screenshot_translate_shortcut) {
            let _ = shortcut_manager.register(shortcut);
        }
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(commands::HistoryState::default())
        .manage(AppState {
            main_shortcut: Mutex::new("CommandOrControl+Shift+U".to_string()),
            input_translate_shortcut: Mutex::new("Control+A".to_string()),
            selection_translate_shortcut: Mutex::new("Control+D".to_string()),
            screenshot_translate_shortcut: Mutex::new("Control+S".to_string()),
        })
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_http::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    if event.state == ShortcutState::Pressed {
                        let state = app.state::<AppState>();
                        let main_s = state.main_shortcut.lock().unwrap();
                        let input_s = state.input_translate_shortcut.lock().unwrap();
                        let selection_s = state.selection_translate_shortcut.lock().unwrap();
                        let screenshot_s = state.screenshot_translate_shortcut.lock().unwrap();

                        if let Ok(s) = Shortcut::from_str(&main_s) {
                            if shortcut == &s {
                                if let Some(window) = app.get_webview_window("main") {
                                    if let Ok(true) = window.is_minimized() {
                                        let _ = window.unminimize();
                                    }
                                    let _ = window.show();
                                    let _ = window.set_focus();
                                }
                            }
                        }

                        if let Ok(s) = Shortcut::from_str(&input_s) {
                            if shortcut == &s {
                                if let Some(window) = app.get_webview_window("shortcut_translate") {
                                    if let Ok(true) = window.is_minimized() {
                                        let _ = window.unminimize();
                                    }
                                    let _ = window.show();
                                    let _ = window.set_focus();
                                }
                            }
                        }

                        if let Ok(s) = Shortcut::from_str(&screenshot_s) {
                            if shortcut == &s {
                                println!("Screenshot translate shortcut pressed");
                                let app_handle = app.clone();
                                tauri::async_runtime::spawn(async move {
                                    let filename = format!("screenshot_{}.png", Uuid::new_v4());
                                    let tmp_file = std::env::temp_dir().join(filename);
                                    let tmp_path = tmp_file.to_string_lossy().to_string();

                                    // Use screencapture for macOS
                                    #[cfg(target_os = "macos")]
                                    let output = Command::new("screencapture")
                                        .arg("-i") // interactive
                                        .arg(&tmp_path)
                                        .output();

                                    // TODO: Add Windows implementation if needed

                                    #[cfg(target_os = "macos")]
                                    match output {
                                        Ok(_) => {
                                            if tmp_file.exists() {
                                                if let Ok(bytes) = fs::read(&tmp_file) {
                                                    let base64_str =
                                                        general_purpose::STANDARD.encode(&bytes);
                                                    let data_url = format!(
                                                        "data:image/png;base64,{}",
                                                        base64_str
                                                    );

                                                    // Emit event to frontend
                                                    if let Some(window) =
                                                        app_handle.get_webview_window("shortcut_translate")
                                                    {
                                                        if let Ok(true) = window.is_minimized() {
                                                            let _ = window.unminimize();
                                                        }
                                                        let _ = window.show();
                                                        let _ = window.set_focus();
                                                        let _ = window.emit(
                                                            "screenshot-captured",
                                                            data_url,
                                                        );
                                                    }

                                                    // Cleanup
                                                    let _ = fs::remove_file(tmp_file);
                                                }
                                            }
                                        }
                                        Err(e) => eprintln!("Screenshot failed: {}", e),
                                    }
                                });
                            }
                        }

                        if let Ok(s) = Shortcut::from_str(&selection_s) {
                            if shortcut == &s {
                                // Simulate Copy
                                if let Ok(mut bot) = Enigo::new(&Settings::default()) {
                                    #[cfg(target_os = "macos")]
                                    {
                                        let _ = bot.key(Key::Meta, enigo::Direction::Press);
                                        let _ = bot.key(Key::Unicode('c'), enigo::Direction::Click);
                                        let _ = bot.key(Key::Meta, enigo::Direction::Release);
                                    }
                                    #[cfg(not(target_os = "macos"))]
                                    {
                                        let _ = bot.key(Key::Control, enigo::Direction::Press);
                                        let _ = bot.key(Key::Unicode('c'), enigo::Direction::Click);
                                        let _ = bot.key(Key::Control, enigo::Direction::Release);
                                    }

                                    // Wait for copy to complete
                                    std::thread::sleep(std::time::Duration::from_millis(100));

                                    // Read clipboard and open window
                                    let clipboard = app.clipboard();
                                    if let Ok(text) = clipboard.read_text() {
                                        if let Some(window) =
                                            app.get_webview_window("shortcut_translate")
                                        {
                                            if let Ok(true) = window.is_minimized() {
                                                let _ = window.unminimize();
                                            }
                                            let _ = window.show();
                                            let _ = window.set_focus();
                                            let _ = window.emit("selection-translate", text);
                                        }
                                    }
                                } else {
                                    eprintln!("Failed to initialize Enigo. Check accessibility permissions.");
                                }
                            }
                        }
                    }
                })
                .build(),
        )
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let icon =
                tauri::image::Image::from_bytes(include_bytes!("../icons/menuIconLight.png"))?;

            let state = app.state::<AppState>();
            let main_shortcut = state.main_shortcut.lock().unwrap().clone();
            let input_shortcut = state.input_translate_shortcut.lock().unwrap().clone();
            let selection_shortcut = state.selection_translate_shortcut.lock().unwrap().clone();
            let screenshot_shortcut = state.screenshot_translate_shortcut.lock().unwrap().clone();

            let main_item = MenuItem::with_id(app, "main", "偏好设置", true, Some(&main_shortcut))?;
            let input_item =
                MenuItem::with_id(app, "input", "输入翻译", true, Some(&input_shortcut))?;
            let selection_item = MenuItem::with_id(
                app,
                "selection",
                "划词翻译",
                true,
                Some(&selection_shortcut),
            )?;
            let screenshot_item = MenuItem::with_id(
                app,
                "screenshot",
                "截图翻译",
                true,
                Some(&screenshot_shortcut),
            )?;

            let separator = PredefinedMenuItem::separator(app)?;
            let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;

            let menu = Menu::with_items(
                app,
                &[
                    &main_item,
                    &separator,
                    &input_item,
                    &screenshot_item,
                    &selection_item,
                    &separator,
                    &quit_item,
                ],
            )?;

            tauri::tray::TrayIconBuilder::new()
                .icon(icon)
                .icon_as_template(true)
                .menu(&menu)
                .on_menu_event(move |app, event| match event.id().as_ref() {
                    "main" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "input" => {
                        if let Some(window) = app.get_webview_window("shortcut_translate") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "selection" => {
                        // For menu click, we can't really simulate selection easily as we lost focus
                        // But we can just open the window
                        if let Some(window) = app.get_webview_window("shortcut_translate") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "screenshot" => {
                        if let Some(window) = app.get_webview_window("shortcut_translate") {
                            let _ = window.show();
                            let _ = window.set_focus();
                            let _ = window.emit("screenshot-translate", ());
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .build(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::my_custom_command,
            commands::get_history_entries,
            commands::append_history_entry,
            commands::clear_history_entries,
            update_shortcuts
        ])
        .on_window_event(|window, event| match event {
            tauri::WindowEvent::CloseRequested { api, .. } => {
                window.hide().unwrap();
                api.prevent_close();
            }
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
