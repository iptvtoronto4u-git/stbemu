plugins { id("com.android.application"); id("org.jetbrains.kotlin.android") }
android { compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
 kotlinOptions { jvmTarget = "17" }
 namespace = "ca.iptvtoronto.personalstb"; compileSdk = 35
 defaultConfig { applicationId = "ca.iptvtoronto.personalstb"; minSdk = 23; targetSdk = 28; versionCode = 1; versionName = "0.1.0" } }
