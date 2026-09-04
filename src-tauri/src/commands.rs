use serde::Serialize;
use serde_json::Value;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter};
use tauri_plugin_store::{Store, StoreExt};

const MAX_HISTORY: usize = 500;

#[derive(Default)]
struct HistoryMutationState {
    revision: u64,
}

#[derive(Default)]
pub struct HistoryState {
    mutation: Mutex<HistoryMutationState>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HistorySnapshot {
    revision: u64,
    entries: Vec<Value>,
}

#[tauri::command]
pub fn my_custom_command() -> String {
    format!("I was invoked from JavaScript!")
}

fn read_history_entries(store: &Store<tauri::Wry>) -> Result<Vec<Value>, String> {
    match store.get("entries") {
        Some(value) => serde_json::from_value(value)
            .map_err(|error| format!("Failed to deserialize history entries: {error}")),
        None => Ok(Vec::new()),
    }
}

fn append_with_limit(entries: &mut Vec<Value>, entry: Value) {
    entries.push(entry);
    if entries.len() > MAX_HISTORY {
        entries.drain(..entries.len() - MAX_HISTORY);
    }
}

#[tauri::command]
pub fn get_history_entries(
    app: AppHandle,
    state: tauri::State<'_, HistoryState>,
) -> Result<HistorySnapshot, String> {
    let mutation = state
        .mutation
        .lock()
        .map_err(|_| "History store lock is poisoned".to_string())?;
    let store = app
        .store("history.json")
        .map_err(|error| format!("Failed to load history store: {error}"))?;

    Ok(HistorySnapshot {
        revision: mutation.revision,
        entries: read_history_entries(&store)?,
    })
}

#[tauri::command]
pub fn append_history_entry(
    app: AppHandle,
    state: tauri::State<'_, HistoryState>,
    entry: Value,
) -> Result<HistorySnapshot, String> {
    let snapshot = {
        let mut mutation = state
            .mutation
            .lock()
            .map_err(|_| "History store lock is poisoned".to_string())?;
        let store = app
            .store("history.json")
            .map_err(|error| format!("Failed to load history store: {error}"))?;
        let mut entries = read_history_entries(&store)?;

        append_with_limit(&mut entries, entry);

        store.set("entries", serde_json::json!(entries));
        store
            .save()
            .map_err(|error| format!("Failed to save history store: {error}"))?;

        mutation.revision = mutation.revision.saturating_add(1);
        let snapshot = HistorySnapshot {
            revision: mutation.revision,
            entries,
        };

        // Emit while holding the mutation lock so update events preserve write order.
        let _ = app.emit("history-updated", &snapshot);
        snapshot
    };
    Ok(snapshot)
}

#[tauri::command]
pub fn clear_history_entries(
    app: AppHandle,
    state: tauri::State<'_, HistoryState>,
) -> Result<HistorySnapshot, String> {
    let snapshot = {
        let mut mutation = state
            .mutation
            .lock()
            .map_err(|_| "History store lock is poisoned".to_string())?;
        let store = app
            .store("history.json")
            .map_err(|error| format!("Failed to load history store: {error}"))?;
        let entries = Vec::new();

        store.set("entries", serde_json::json!(entries));
        store
            .save()
            .map_err(|error| format!("Failed to save history store: {error}"))?;

        mutation.revision = mutation.revision.saturating_add(1);
        let snapshot = HistorySnapshot {
            revision: mutation.revision,
            entries,
        };

        let _ = app.emit("history-updated", &snapshot);
        snapshot
    };
    Ok(snapshot)
}

#[cfg(test)]
mod tests {
    use super::{append_with_limit, MAX_HISTORY};
    use serde_json::json;

    #[test]
    fn append_history_keeps_the_newest_entries() {
        let mut entries = (0..MAX_HISTORY)
            .map(|index| json!(index))
            .collect::<Vec<_>>();

        append_with_limit(&mut entries, json!(MAX_HISTORY));

        assert_eq!(entries.len(), MAX_HISTORY);
        assert_eq!(entries.first(), Some(&json!(1)));
        assert_eq!(entries.last(), Some(&json!(MAX_HISTORY)));
    }
}
