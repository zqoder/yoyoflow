// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use std::str::FromStr;
use std::sync::Mutex;
use tauri::Manager;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

mod commands;

struct AppState {
    main_shortcut: Mutex<String>,
    input_translate_shortcut: Mutex<String>,
}

#[tauri::command]
fn update_shortcuts(
    app: tauri::AppHandle,
    main_shortcut: String,
    input_translate_shortcut: String,
    state: tauri::State<AppState>,
) -> Result<(), String> {
    let shortcut_manager = app.global_shortcut();

    // Unregister all existing shortcuts
    let _ = shortcut_manager.unregister_all();

    // Update state
    *state.main_shortcut.lock().unwrap() = main_shortcut.clone();
    *state.input_translate_shortcut.lock().unwrap() = input_translate_shortcut.clone();

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

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState {
            main_shortcut: Mutex::new("CommandOrControl+Shift+U".to_string()),
            input_translate_shortcut: Mutex::new("Control+A".to_string()),
        })
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    if event.state == ShortcutState::Pressed {
                        let state = app.state::<AppState>();
                        let main_s = state.main_shortcut.lock().unwrap();
                        let input_s = state.input_translate_shortcut.lock().unwrap();

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
                    }
                })
                .build(),
        )
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let icon =
                tauri::image::Image::from_bytes(include_bytes!("../icons/menuIconLight.png"))?;

            tauri::tray::TrayIconBuilder::new()
                .icon(icon)
                .icon_as_template(true)
                .on_tray_icon_event(|tray, event| match event {
                    tauri::tray::TrayIconEvent::Click {
                        button: tauri::tray::MouseButton::Left,
                        ..
                    } => {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {}
                })
                .build(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::my_custom_command,
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
