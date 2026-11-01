plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.kapt)
}
android {
    namespace = "com.iptvtoronto.tv"
    compileSdk = 36
    defaultConfig {
        applicationId = "com.iptvtoronto.tv"
        minSdk = 22
        targetSdk = 36
        versionCode = 2
        versionName = "0.2.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        ndk { abiFilters += listOf("armeabi-v7a", "arm64-v8a", "x86", "x86_64") }
    }
    buildFeatures { compose = true; buildConfig = true }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    kotlinOptions { jvmTarget = "17" }
    signingConfigs {
        create("store") {
            if (System.getenv("IPTV_KEYSTORE") != null) {
                storeFile = file(System.getenv("IPTV_KEYSTORE"))
                storePassword = System.getenv("IPTV_STORE_PASSWORD")
                keyAlias = System.getenv("IPTV_KEY_ALIAS")
                keyPassword = System.getenv("IPTV_KEY_PASSWORD")
            }
        }
    }
    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            if (System.getenv("IPTV_KEYSTORE") != null) signingConfig = signingConfigs.getByName("store")
        }
    }
    packaging { resources.excludes += "/META-INF/{AL2.0,LGPL2.1}" }
    testOptions { unitTests.isReturnDefaultValues = true }
}
dependencies {
    implementation(platform(libs.compose.bom))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.foundation:foundation")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation(libs.activity); implementation(libs.tv); implementation(libs.tv.foundation)
    implementation(libs.navigation); implementation(libs.lifecycle)
    implementation(libs.room); implementation(libs.room.ktx); kapt(libs.room.compiler)
    implementation(libs.datastore); implementation(libs.security)
    implementation(libs.okhttp); implementation(libs.moshi); implementation(libs.koin); implementation(libs.coil)
    implementation(libs.media.player); implementation(libs.media.ui); implementation(libs.media.hls)
    implementation(libs.media.dash); implementation(libs.media.http)
    testImplementation(libs.junit); testImplementation(libs.mockwebserver)
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.9.0")
    androidTestImplementation(platform(libs.compose.bom))
    androidTestImplementation("androidx.compose.ui:ui-test-junit4")
    androidTestImplementation("androidx.test.ext:junit:1.2.1")
    debugImplementation("androidx.compose.ui:ui-test-manifest")
}
