plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
}
android {
    namespace = "info.cosmonet.browser.nativebridge"
    compileSdk = 37
    defaultConfig { minSdk = 28 }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }
}
dependencies {
    implementation(project(":tauri-android"))
    implementation("androidx.webkit:webkit:1.16.0")
    implementation("androidx.activity:activity-ktx:1.10.1")
}
