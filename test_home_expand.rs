// Test script to verify openfang_home() behavior
use std::path::PathBuf;

fn main() {
    // Test 1: OPENFANG_HOME with ~/
    std::env::set_var("OPENFANG_HOME", "~/.openfang");
    let home1 = openfang_home();
    println!("Test 1 - OPENFANG_HOME='~/.openfang':");
    println!("  Result: {:?}", home1);
    println!("  Contains literal ~: {}", home1.to_string_lossy().contains("~"));

    // Test 2: OPENFANG_HOME with absolute path
    std::env::set_var("OPENFANG_HOME", "/tmp/test_openfang");
    let home2 = openfang_home();
    println!("\nTest 2 - OPENFANG_HOME='/tmp/test_openfang':");
    println!("  Result: {:?}", home2);

    // Test 3: No OPENFANG_HOME (should use ~/.openfang)
    std::env::remove_var("OPENFANG_HOME");
    let home3 = openfang_home();
    println!("\nTest 3 - No OPENFANG_HOME:");
    println!("  Result: {:?}", home3);
}

fn openfang_home() -> PathBuf {
    if let Ok(home) = std::env::var("OPENFANG_HOME") {
        let path = if home.starts_with("~/") {
            dirs::home_dir()
                .map(|h| h.join(&home[2..]))
                .unwrap_or_else(|| PathBuf::from(&home))
        } else {
            PathBuf::from(home)
        };
        return path;
    }
    dirs::home_dir()
        .unwrap_or_else(std::env::temp_dir)
        .join(".openfang")
}