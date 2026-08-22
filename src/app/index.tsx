import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";

// Prevent auto hiding of native splash screen
SplashScreen.preventAutoHideAsync();

export default function AppSplashScreen() {
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    async function prepareAndAnimate() {
      try {
        // Hide native splash screen so custom animation becomes visible
        await SplashScreen.hideAsync();

        // Trigger Smooth Zoom-In & Fade-In Animation
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]).start();
      } catch (e) {
        console.warn(e);
      }
    }

    prepareAndAnimate();

    // 2.5 seconds baad main screen par replace ho jayega
    const timer = setTimeout(() => {
      router.replace("/screen/WorkerLogin");
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <LinearGradient
      colors={["#030712", "#0F172A", "#052E16"]}
      locations={[0, 0.5, 1]}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor="#030712" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <Animated.View
            style={[
              styles.logoBox,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            {/* App Branding Icon */}
            <View style={styles.iconCircle}>
              <Text style={styles.logoIcon}>💼</Text>
            </View>

            {/* App Main Title */}
            <Text style={styles.title}>
              Roz<Text style={styles.highlightText}>Kaam</Text>
            </Text>

            {/* Tagline */}
            <Text style={styles.tagline}>Aapka Bharosemand Job Partner</Text>
            <Text style={styles.subTagline}>Connecting Workers & Employers</Text>
          </Animated.View>
        </View>

        {/* Bottom Loader */}
        <View style={styles.footer}>
          <ActivityIndicator size="small" color="#4ADE80" style={{ marginBottom: 10 }} />
          <Text style={styles.versionText}>Version 1.0.0 • Verified Platform</Text>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 30,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logoBox: {
    alignItems: "center",
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(22, 163, 74, 0.2)",
    borderWidth: 2,
    borderColor: "#4ADE80",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#4ADE80",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  logoIcon: {
    fontSize: 42,
  },
  title: {
    fontSize: 42,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -1,
  },
  highlightText: {
    color: "#4ADE80",
  },
  tagline: {
    color: "#CBD5E1",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 10,
  },
  subTagline: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 4,
    fontWeight: "500",
  },
  footer: {
    alignItems: "center",
  },
  versionText: {
    color: "#4ADE80",
    fontSize: 11,
    fontWeight: "600",
    opacity: 0.8,
  },
});