import React, { useState, useEffect, useCallback } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { View, StyleSheet, Platform, BackHandler, Alert } from "react-native";
import * as ExpoSplashScreen from "expo-splash-screen";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SplashScreen } from "./src/screens/SplashScreen";
import { LoginScreen } from "./src/screens/LoginScreen";
import { DashboardPreview } from "./src/screens/DashboardPreview";
import { AboutModal } from "./src/components/AboutModal";
import { ErrorBoundary } from "./src/components/ErrorBoundary";

// Ensure splash screen autohide is prevented until React mounts
ExpoSplashScreen.preventAutoHideAsync().catch(() => {});

const AUTH_STORAGE_KEY = "@ssa_founder_authenticated";

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<"splash" | "login" | "dashboard">("splash");
  const [isDark, setIsDark] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // 1. Initial startup & session restoration
  useEffect(() => {
    async function prepare() {
      try {
        const savedAuth = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        if (savedAuth === "true") {
          setCurrentScreen("dashboard");
        }
      } catch (e) {
        console.warn("Session restore error:", e);
      } finally {
        setIsReady(true);
        // Dismiss native splash screen overlay smoothly
        await ExpoSplashScreen.hideAsync().catch(() => {});
      }
    }
    prepare();
  }, []);

  // 2. Android hardware back button handler
  useEffect(() => {
    if (Platform.OS !== "android") return;

    const onBackPress = () => {
      if (showAbout) {
        setShowAbout(false);
        return true;
      }

      if (currentScreen === "dashboard") {
        Alert.alert(
          "Exit SSA",
          "Do you want to close SmartShopper Admin?",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Exit", onPress: () => BackHandler.exitApp() }
          ]
        );
        return true;
      }

      if (currentScreen === "login") {
        BackHandler.exitApp();
        return true;
      }

      return false;
    };

    const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => subscription.remove();
  }, [currentScreen, showAbout]);

  const handleLoginSuccess = async () => {
    try {
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, "true");
    } catch {}
    setCurrentScreen("dashboard");
  };

  const handleSignOut = async () => {
    try {
      await AsyncStorage.multiRemove([AUTH_STORAGE_KEY, "@ssa_admin_email", "@ssa_admin_role"]);
    } catch {}
    setCurrentScreen("login");
  };

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <SafeAreaView
          style={[styles.root, { backgroundColor: isDark ? "#0B0F17" : "#FFFFFF" }]}
          edges={["top", "bottom", "left", "right"]}
        >
          <StatusBar style={isDark ? "light" : "dark"} />

          {/* Screen Routing */}
          {currentScreen === "splash" && (
            <SplashScreen
              onFinish={() => setCurrentScreen("login")}
              durationMs={2000}
            />
          )}

          {currentScreen === "login" && (
            <LoginScreen
              isDark={isDark}
              onToggleTheme={() => setIsDark((prev) => !prev)}
              onLoginSuccess={handleLoginSuccess}
              onOpenAbout={() => setShowAbout(true)}
            />
          )}

          {currentScreen === "dashboard" && (
            <DashboardPreview
              isDark={isDark}
              onToggleTheme={() => setIsDark((prev) => !prev)}
              onOpenAbout={() => setShowAbout(true)}
              onSignOut={handleSignOut}
            />
          )}

          {/* About SSA Modal */}
          <AboutModal
            visible={showAbout}
            onClose={() => setShowAbout(false)}
            isDark={isDark}
          />
        </SafeAreaView>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  }
});
