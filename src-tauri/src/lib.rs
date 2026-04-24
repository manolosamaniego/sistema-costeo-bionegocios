use std::fs;
use std::fs::OpenOptions;
use std::io::Write;
use std::path::PathBuf;
use std::process::Command;
use std::thread::sleep;
use std::time::Duration;
use std::time::{SystemTime, UNIX_EPOCH};

use base64::Engine;
use reqwest::blocking::Client;
use tauri::{AppHandle, Manager};
use tauri_plugin_dialog::{DialogExt, FilePath};
use tauri_plugin_opener::OpenerExt;

fn branding_file_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("No se pudo resolver la carpeta de datos: {e}"))?;
    fs::create_dir_all(&app_data_dir)
        .map_err(|e| format!("No se pudo crear la carpeta de datos: {e}"))?;
    Ok(app_data_dir.join("branding.json"))
}

fn diagnostics_file_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("No se pudo resolver la carpeta de datos: {e}"))?;
    fs::create_dir_all(&app_data_dir)
        .map_err(|e| format!("No se pudo crear la carpeta de datos: {e}"))?;
    Ok(app_data_dir.join("diagnostics.log"))
}

fn file_path_to_pathbuf(file_path: Option<FilePath>, empty_message: &str) -> Result<PathBuf, String> {
    let path = file_path.ok_or_else(|| empty_message.to_string())?;
    path.into_path()
        .map_err(|_| "La ruta seleccionada no es un archivo local compatible.".to_string())
}

fn edge_executable_path() -> Result<PathBuf, String> {
    let candidates = [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    ];

    candidates
        .iter()
        .map(PathBuf::from)
        .find(|path| path.exists())
        .ok_or_else(|| {
            "No se encontró Microsoft Edge o Google Chrome para generar el PDF A4 automático."
                .to_string()
        })
}

fn ensure_pdf_extension(mut path: PathBuf) -> PathBuf {
    if path
        .extension()
        .and_then(|value| value.to_str())
        .map(|value| value.eq_ignore_ascii_case("pdf"))
        .unwrap_or(false)
    {
        return path;
    }

    path.set_extension("pdf");
    path
}

fn path_to_file_url(path: &PathBuf) -> Result<String, String> {
    let canonical = path
        .canonicalize()
        .map_err(|e| format!("No se pudo resolver el archivo temporal del informe: {e}"))?;
    let url = reqwest::Url::from_file_path(&canonical)
        .map_err(|_| "No se pudo convertir el informe temporal a una URL local válida.".to_string())?;
    Ok(url.to_string())
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
fn export_report_pdf_a4(app: AppHandle, html: String, suggested_name: String) -> Result<String, String> {
    let safe_name = if suggested_name.trim().is_empty() {
        "informe_costeo_a4".to_string()
    } else {
        suggested_name
            .chars()
            .map(|c| if c.is_ascii_alphanumeric() || c == '_' || c == '-' { c } else { '_' })
            .collect::<String>()
    };

    let file_path = app
        .dialog()
        .file()
        .add_filter("PDF", &["pdf"])
        .set_file_name(format!("{safe_name}.pdf"))
        .blocking_save_file();

    let target_path = ensure_pdf_extension(file_path_to_pathbuf(
        file_path,
        "No se seleccionó una ruta para guardar el informe PDF.",
    )?);

    if target_path.exists() {
        fs::remove_file(&target_path)
            .map_err(|e| format!("No se pudo reemplazar el PDF anterior en la ruta elegida: {e}"))?;
    }

    let millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| format!("No se pudo generar el nombre temporal: {e}"))?
        .as_millis();
    let temp_path = std::env::temp_dir().join(format!("informe_costeo_a4_{millis}.html"));

    fs::write(&temp_path, html)
        .map_err(|e| format!("No se pudo preparar el informe temporal: {e}"))?;
    let temp_url = path_to_file_url(&temp_path)?;

    let browser_path = edge_executable_path()?;
    let pdf_arg = format!("--print-to-pdf={}", target_path.display());
    let output = Command::new(browser_path)
        .arg("--headless=new")
        .arg("--disable-gpu")
        .arg("--disable-crash-reporter")
        .arg("--disable-features=Crashpad")
        .arg("--no-pdf-header-footer")
        .arg(pdf_arg)
        .arg(temp_url)
        .output()
        .map_err(|e| format!("No se pudo ejecutar el generador PDF A4: {e}"))?;

    let _ = fs::remove_file(&temp_path);

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(format!(
            "No se pudo generar el PDF A4. Código de salida: {:?}. {}",
            output.status.code(),
            if stderr.is_empty() {
                "El navegador no devolvió detalle adicional.".to_string()
            } else {
                format!("Detalle técnico: {stderr}")
            }
        ));
    }

    for _ in 0..40 {
        if target_path.exists() {
            return Ok(target_path.display().to_string());
        }
        sleep(Duration::from_millis(200));
    }

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    Err(format!(
        "El generador terminó, pero no se encontró el PDF A4 creado en la ruta esperada. Ruta esperada: {}. {} {}",
        target_path.display(),
        if stderr.is_empty() {
            String::new()
        } else {
            format!("Detalle técnico stderr: {stderr}.")
        },
        if stdout.is_empty() {
            String::new()
        } else {
            format!("Salida del generador: {stdout}.")
        }
    ))
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

#[tauri::command]
fn append_diagnostic_log(app: AppHandle, entry: String) -> Result<String, String> {
    let path = diagnostics_file_path(&app)?;
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&path)
        .map_err(|e| format!("No se pudo abrir el log de diagnóstico: {e}"))?;

    file.write_all(entry.as_bytes())
        .map_err(|e| format!("No se pudo escribir el log de diagnóstico: {e}"))?;
    file.write_all(b"\n")
        .map_err(|e| format!("No se pudo cerrar la línea del log: {e}"))?;

    Ok(path.display().to_string())
}

#[tauri::command]
fn export_diagnostic_log(app: AppHandle) -> Result<String, String> {
    let source_path = diagnostics_file_path(&app)?;
    if !source_path.exists() {
        fs::write(&source_path, "")
            .map_err(|e| format!("No se pudo crear el log de diagnóstico: {e}"))?;
    }

    let file_path = app
        .dialog()
        .file()
        .add_filter("LOG", &["log", "txt"])
        .set_file_name("diagnostico_costeo.log")
        .blocking_save_file();

    let target_path = file_path_to_pathbuf(file_path, "No se seleccionó una ruta para exportar el log técnico.")?;
    let contents = fs::read(&source_path)
        .map_err(|e| format!("No se pudo leer el log de diagnóstico: {e}"))?;
    fs::write(&target_path, contents)
        .map_err(|e| format!("No se pudo exportar el log de diagnóstico: {e}"))?;

    Ok(target_path.display().to_string())
}

#[tauri::command]
fn clear_diagnostic_log(app: AppHandle) -> Result<String, String> {
    let path = diagnostics_file_path(&app)?;
    fs::write(&path, "").map_err(|e| format!("No se pudo limpiar el log de diagnóstico: {e}"))?;
    Ok(path.display().to_string())
}

#[tauri::command]
fn fetch_remote_text(url: String) -> Result<String, String> {
    let client = Client::builder()
        .build()
        .map_err(|e| format!("No se pudo crear el cliente HTTP: {e}"))?;

    let response = client
        .get(&url)
        .send()
        .map_err(|e| format!("No fue posible consultar actualizaciones remotas. {e}"))?;

    if !response.status().is_success() {
        return Err(format!(
            "No fue posible consultar actualizaciones remotas. Estado {}.",
            response.status()
        ));
    }

    response
        .text()
        .map_err(|e| format!("No fue posible leer la respuesta remota. {e}"))
}

#[tauri::command]
fn open_external_url(app: AppHandle, url: String) -> Result<(), String> {
    let trimmed = url.trim();
    let parsed = reqwest::Url::parse(trimmed)
        .map_err(|e| format!("El enlace de actualización no es válido: {e}"))?;

    match parsed.scheme() {
        "http" | "https" => app
            .opener()
            .open_url(trimmed, None::<&str>)
            .map_err(|e| format!("No se pudo abrir el enlace de actualización: {e}")),
        _ => Err("Solo se permiten enlaces de actualización http o https.".to_string()),
    }
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
            export_report_pdf_a4,
            import_logo_file,
            append_diagnostic_log,
            export_diagnostic_log,
            clear_diagnostic_log,
            fetch_remote_text,
            open_external_url
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
