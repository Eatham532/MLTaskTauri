use std::env;
use std::path::PathBuf;

fn main() {
    // println!("cargo:warning=PATH={}", std::env::var("PATH").unwrap_or_default());

    tauri_build::build()
}
