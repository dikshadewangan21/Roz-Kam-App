import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  StatusBar,
  ScrollView,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

export default function AuthSelectionScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleWorker = useRef(new Animated.Value(1)).current;
  const scaleCompany = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <LinearGradient
      colors={["#030712", "#0F172A", "#052E16"]}
      locations={[0, 0.45, 1]}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor="#030712" />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* App Brand Header */}
            <View style={styles.headerContainer}>
              <View style={styles.logoBadge}>
                <Image
                  source={require("../../../assets/images/rozkaam-logo.jpg")}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.appName}>
                Roz<Text style={styles.brandAccent}>Kaam</Text>
              </Text>
              <Text style={styles.tagline}>Aaj Kaam, Aaj Paisa</Text>
              <Text style={styles.subtitle}>
                Choose your login role to access your dedicated dashboard
              </Text>
            </View>

            {/* Selection Cards */}
            <View style={styles.cardsContainer}>
              {/* Option 1: Worker Login */}
              <TouchableOpacity
                activeOpacity={0.88}
                style={[styles.roleCard, styles.workerCard]}
                onPress={() => router.push("/screen/WorkerLogin")}
              >
                <LinearGradient
                  colors={["rgba(22, 163, 74, 0.22)", "rgba(5, 46, 22, 0.5)"]}
                  style={styles.cardGradient}
                >
                  <View style={styles.cardHeader}>
                    <View style={[styles.iconCircle, styles.workerIconCircle]}>
                      <Text style={styles.roleIcon}>👷‍♂️</Text>
                    </View>
                    <View style={styles.badgeGreen}>
                      <Text style={styles.badgeGreenText}>DAILY WORKER</Text>
                    </View>
                  </View>

                  <Text style={styles.roleTitle}>Worker Login</Text>
                  <Text style={styles.roleHindiTitle}>कामगार लॉगिन</Text>
                  <Text style={styles.roleDescription}>
                    Find daily jobs, receive same-day payments, mark attendance, and manage your earnings wallet.
                  </Text>

                  <View style={styles.featuresRow}>
                    <View style={styles.featureItem}>
                      <Text style={styles.featureBullet}>✓</Text>
                      <Text style={styles.featureText}>Instant Daily Pay</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <Text style={styles.featureBullet}>✓</Text>
                      <Text style={styles.featureText}>Verified Jobs</Text>
                    </View>
                  </View>

                  <View style={styles.workerBtn}>
                    <Text style={styles.workerBtnText}>CONTINUE AS WORKER →</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.registerLink}
                    onPress={() => router.push("/screen/WorkerRegister")}
                  >
                    <Text style={styles.registerLinkText}>
                      New Worker? <Text style={{ color: "#4ADE80", fontWeight: "700" }}>Register Here</Text>
                    </Text>
                  </TouchableOpacity>
                </LinearGradient>
              </TouchableOpacity>

              {/* Option 2: Company Login */}
              <TouchableOpacity
                activeOpacity={0.88}
                style={[styles.roleCard, styles.companyCard]}
                onPress={() => router.push("/screen/CompanyLogin")}
              >
                <LinearGradient
                  colors={["rgba(37, 99, 235, 0.22)", "rgba(15, 23, 42, 0.6)"]}
                  style={styles.cardGradient}
                >
                  <View style={styles.cardHeader}>
                    <View style={[styles.iconCircle, styles.companyIconCircle]}>
                      <Text style={styles.roleIcon}>🏢</Text>
                    </View>
                    <View style={styles.badgeBlue}>
                      <Text style={styles.badgeBlueText}>EMPLOYER / COMPANY</Text>
                    </View>
                  </View>

                  <Text style={styles.roleTitle}>Company Login</Text>
                  <Text style={styles.roleHindiTitle}>कंपनी / ठेकेदार लॉगिन</Text>
                  <Text style={styles.roleDescription}>
                    Post job openings, hire verified workers on demand, track live check-ins, and manage contractor payroll.
                  </Text>

                  <View style={styles.featuresRow}>
                    <View style={styles.featureItem}>
                      <Text style={[styles.featureBullet, { color: "#60A5FA" }]}>✓</Text>
                      <Text style={styles.featureText}>Hire in 2 Mins</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <Text style={[styles.featureBullet, { color: "#60A5FA" }]}>✓</Text>
                      <Text style={styles.featureText}>GST Invoicing</Text>
                    </View>
                  </View>

                  <View style={styles.companyBtn}>
                    <Text style={styles.companyBtnText}>CONTINUE AS COMPANY →</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.registerLink}
                    onPress={() => router.push("/screen/CompanyRegister")}
                  >
                    <Text style={styles.registerLinkText}>
                      New Company? <Text style={{ color: "#60A5FA", fontWeight: "700" }}>Register Here</Text>
                    </Text>
                  </TouchableOpacity>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Footer trust badge */}
            <View style={styles.footerContainer}>
              <Text style={styles.footerBadge}>🛡️ 100% Verified Platform • Secure & Direct Payments</Text>
              <Text style={styles.versionText}>RozKaam Version 1.0.0</Text>
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    flexGrow: 1,
    justifyContent: "center",
  },
  content: { width: "100%" },
  headerContainer: { alignItems: "center", marginBottom: 26 },
  logoBadge: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    padding: 6,
    marginBottom: 14,
    shadowColor: "#4ADE80",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
    overflow: "hidden",
  },
  logoImage: { width: "100%", height: "100%", borderRadius: 14 },
  appName: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  brandAccent: { color: "#4ADE80" },
  tagline: {
    color: "#4ADE80",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 4,
    letterSpacing: 0.5,
  },
  subtitle: {
    color: "#94A3B8",
    fontSize: 13,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  cardsContainer: { gap: 18 },
  roleCard: {
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1.5,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
  },
  workerCard: {
    borderColor: "rgba(74, 222, 128, 0.35)",
    backgroundColor: "rgba(5, 46, 22, 0.4)",
  },
  companyCard: {
    borderColor: "rgba(96, 165, 250, 0.35)",
    backgroundColor: "rgba(15, 23, 42, 0.6)",
  },
  cardGradient: { padding: 20 },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  workerIconCircle: { backgroundColor: "rgba(22, 163, 74, 0.25)" },
  companyIconCircle: { backgroundColor: "rgba(37, 99, 235, 0.25)" },
  roleIcon: { fontSize: 24 },
  badgeGreen: {
    backgroundColor: "rgba(22, 163, 74, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(74, 222, 128, 0.4)",
  },
  badgeGreenText: { color: "#4ADE80", fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  badgeBlue: {
    backgroundColor: "rgba(37, 99, 235, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(96, 165, 250, 0.4)",
  },
  badgeBlueText: { color: "#60A5FA", fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  roleTitle: { color: "#FFFFFF", fontSize: 22, fontWeight: "800" },
  roleHindiTitle: { color: "#CBD5E1", fontSize: 13, fontWeight: "600", marginTop: 2 },
  roleDescription: {
    color: "#94A3B8",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 8,
  },
  featuresRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 12,
    marginBottom: 14,
  },
  featureItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  featureBullet: { color: "#4ADE80", fontSize: 12, fontWeight: "900" },
  featureText: { color: "#E2E8F0", fontSize: 12, fontWeight: "600" },
  workerBtn: {
    backgroundColor: "#16A34A",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  workerBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800", letterSpacing: 0.5 },
  companyBtn: {
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  companyBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800", letterSpacing: 0.5 },
  registerLink: { marginTop: 10, alignItems: "center" },
  registerLinkText: { color: "#94A3B8", fontSize: 12 },
  footerContainer: { alignItems: "center", marginTop: 28 },
  footerBadge: { color: "#94A3B8", fontSize: 12, fontWeight: "600", textAlign: "center" },
  versionText: { color: "#64748B", fontSize: 11, marginTop: 4 },
});
