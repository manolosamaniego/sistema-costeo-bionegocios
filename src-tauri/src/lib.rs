use std::fs;
use std::path::PathBuf;

use base64::Engine;
use tauri::{AppHandle, Manager};
use tauri_plugin_dialog::{DialogExt, FilePath};

fn branding_file_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("No se pudo resolver la carpeta de datos: {e}"))?;
    fs::create_dir_all(&app_data_dir)
        .map_err(|e| format!("No se pudo crear la carpeta de datos: {e}"))?;
    Ok(app_data_dir.join("branding.json"))
}

fn file_path_to_pathbuf(file_path: Option<FilePath>, empty_message: &str) -> Result<PathBuf, String> {
    let path = file_path.ok_or_else(|| empty_message.to_string())?;
    path.into_path()
        .map_err(|_| "La ruta seleccionada no es un archivo local compatible.".to_string())
}

#[tauri::command]
fn load_branding_file(app: AppHandle) -> Result<String, String> {
    let path = branding_file_path(&app)?;
    if !path.exists() {
        return Ok(String::new());
    }
    fs::read_to_string(&path).map_err(|e| format!("No se pudo leer el branding externo: {e}"))
}

#[tauri::command]
fn save_branding_file(app: AppHandle, contents: String) -> Result<String, String> {
    let path = branding_file_path(&app)?;
    fs::write(&path, contents).map_err(|e| format!("No se pudo guardar el branding externo: {e}"))?;
    Ok(path.display().to_string())
}

#[tauri::command]
fn export_branding_file(app: AppHandle, contents: String, suggested_name: String) -> Result<String, String> {
    let safe_name = if suggested_name.trim().is_empty() {
        "branding_cliente".to_string()
    } else {
        suggested_name
            .chars()
            .map(|c| if c.is_ascii_alphanumeric() || c == '_' || c == '-' { c } else { '_' })
            .collect::<String>()
    };

    let file_path = app
        .dialog()
        .file()
        .add_filter("JSON", &["json"])
        .set_file_name(format!("{safe_name}.json"))
        .blocking_save_file();

    let path = file_path_to_pathbuf(file_path, "No se seleccionó una ruta para exportar la marca.")?;
    fs::write(&path, contents).map_err(|e| format!("No se pudo exportar el branding: {e}"))?;
    Ok(path.display().to_string())
}

#[tauri::command]
fn export_costeo_file(app: AppHandle, contents: String, suggested_name: String) -> Result<String, String> {
    let safe_name = if suggested_name.trim().is_empty() {
        "costeo_bionegocios".to_string()
    } else {
        suggested_name
            .chars()
            .map(|c| if c.is_ascii_alphanumeric() || c == '_' || c == '-' { c } else { '_' })
            .collect::<String>()
    };

    let file_path = app
        .dialog()
        .file()
        .add_filter("JSON", &["json"])
        .set_file_name(format!("{safe_name}.json"))
        .blocking_save_file();

    let path = file_path_to_pathbuf(file_path, "No se seleccionó una ruta para exportar el costeo.")?;
    fs::write(&path, contents).map_err(|e| format!("No se pudo exportar el costeo: {e}"))?;
    Ok(path.display().to_string())
}

#[tauri::command]
fn import_costeo_file(app: AppHandle) -> Result<String, String> {
    let file_path = app
        .dialog()
        .file()
        .add_filter("JSON", &["json"])
        .blocking_pick_file();

    let path = file_path_to_pathbuf(file_path, "No se seleccionó un archivo de costeo.")?;
    fs::read_to_string(&path).map_err(|e| format!("No se pudo leer el respaldo de costeo: {e}"))
}

#[tauri::command]
fn import_logo_file(app: AppHandle) -> Result<String, String> {
    let file_path = app
        .dialog()
        .file()
        .add_filter("Imagen", &["png", "jpg", "jpeg", "svg", "webp"])
        .blocking_pick_file();

    let path = file_path_to_pathbuf(file_path, "No se seleccionó un logo.")?;
    let bytes = fs::read(&path).map_err(|e| format!("No se pudo leer el logo: {e}"))?;
    let ext = path
        .extension()
        .and_then(|v| v.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();

    let mime = match ext.as_str() {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "svg" => "image/svg+xml",
        "webp" => "image/webp",
        _ => "application/octet-stream",
    };

    let encoded = base64::engine::general_purpose::STANDARD.encode(bytes);
    Ok(format!("data:{mime};base64,{encoded}"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            load_branding_file,
            save_branding_file,
            export_branding_file,
            export_costeo_file,
            import_costeo_file,
            import_logo_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
