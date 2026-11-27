fn main() {
    // No public frontend plugin commands. The Rust app validates the trusted UI
    // before forwarding operations to the native Android implementation.
    tauri_plugin::Builder::new(&[]).android_path("android").build();
}
