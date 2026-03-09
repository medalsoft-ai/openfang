use std::env;
use std::path::Path;
use std::process::Command;

fn main() {
    let profile = env::var("PROFILE").unwrap_or_else(|_| "debug".to_string());

    // openfang-webui目录路径（与openfang-desktop同级）
    let webui_dir = Path::new(concat!(env!("CARGO_MANIFEST_DIR"), "/../openfang-webui"));
    let webui_dist = webui_dir.join("dist");

    // 只在生产构建时检查/构建React
    if profile == "release" && !webui_dist.exists() {
        println!("cargo:warning=Building React UI in openfang-webui...");

        // 安装依赖
        let status = Command::new("pnpm")
            .args(["install"])
            .current_dir(webui_dir)
            .status()
            .expect("pnpm install failed. Is pnpm installed?");
        assert!(status.success(), "pnpm install failed");

        // 构建React
        let status = Command::new("pnpm")
            .args(["build"])
            .current_dir(webui_dir)
            .status()
            .expect("pnpm build failed");
        assert!(status.success(), "pnpm build failed");
    }

    // 通知Cargo监视webui变化
    println!("cargo:rerun-if-changed={}", webui_dir.join("dist").display());
    println!("cargo:rerun-if-changed={}", webui_dir.join("src").display());
    println!("cargo:rerun-if-changed={}", webui_dir.join("package.json").display());

    tauri_build::build();
}
