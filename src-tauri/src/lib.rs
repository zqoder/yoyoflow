// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use enigo::{Enigo, Key, Keyboard, Settings};
use std::str::FromStr;
use std::sync::Mutex;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::{Emitter, Manager};
use tauri_plugin_clipboard_manager::ClipboardExt;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

mod commands;

struct AppState {
    main_shortcut: Mutex<String>,
    input_translate_shortcut: Mutex<String>,
    selection_translate_shortcut: Mutex<String>,
}

#[tauri::command]
fn update_shortcuts(
    app: tauri::AppHandle,
    main_shortcut: String,
    input_translate_shortcut: String,
    selection_translate_shortcut: String,
    state: tauri::State<AppState>,
) -> Result<(), String> {
    let shortcut_manager = app.global_shortcut();

    // Unregister all existing shortcuts
    let _ = shortcut_manager.unregister_all();

    // Update state
    *state.main_shortcut.lock().unwrap() = main_shortcut.clone();
    *state.input_translate_shortcut.lock().unwrap() = input_translate_shortcut.clone();
    *state.selection_translate_shortcut.lock().unwrap() = selection_translate_shortcut.clone();

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

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState {
            main_shortcut: Mutex::new("CommandOrControl+Shift+U".to_string()),
            input_translate_shortcut: Mutex::new("Control+A".to_string()),
            selection_translate_shortcut: Mutex::new("Control+D".to_string()),
        })
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    if event.state == ShortcutState::Pressed {
                        let state = app.state::<AppState>();
                        let main_s = state.main_shortcut.lock().unwrap();
                        let input_s = state.input_translate_shortcut.lock().unwrap();
                        let selection_s = state.selection_translate_shortcut.lock().unwrap();

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

            let main_item = MenuItem::with_id(app, "main", "主窗口", true, Some(&main_shortcut))?;
            let input_item =
                MenuItem::with_id(app, "input", "输入翻译", true, Some(&input_shortcut))?;
            let selection_item = MenuItem::with_id(
                app,
                "selection",
                "划词翻译",
                true,
                Some(&selection_shortcut),
            )?;

            let separator = PredefinedMenuItem::separator(app)?;
            let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;

            let menu = Menu::with_items(
                app,
                &[
                    &main_item,
                    &input_item,
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
