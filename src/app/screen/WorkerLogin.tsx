import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../constants/firebaseConfig";
import {
  sendFirebaseOtp,
  verifyFirebaseOtp,
  parseAuthErrorMessage,
} from "../../services/nativeAuthService";

export default function WorkerLoginScreen() {
  const [mobileNumber, setMobileNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Forgot Password States
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [resetPhone, setResetPhone] = useState("");
  const [resetOtp, setResetOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [resendTimer, setResendTimer] = useState<number>(0);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Countdown timer for OTP resend
  useEffect(() => {
    let interval: any;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleLogin = async () => {
    const cleanPhone = mobileNumber.replace(/[^0-9]/g, "").slice(-10);

    if (cleanPhone.length !== 10) {
      Alert.alert("Input Required", "Please enter a valid 10-digit mobile number.");
      return;
    }
    if (password.length < 8) {
      Alert.alert("Invalid Password", "Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);

    try {
      const workerId = `WORKER_${cleanPhone}`;
      const userRef = doc(db, "users", workerId);
      const userSnap = await getDoc(userRef);

      setLoading(false);

      if (!userSnap.exists()) {
        Alert.alert(
          "Account Not Registered ❌",
          "No worker account registered with this number. Please Register!",
          [
            { text: "Register Now", onPress: () => router.push("/screen/WorkerRegister") },
            { text: "Cancel", style: "cancel" },
          ]
        );
        return;
      }

      const userData = userSnap.data();

      if (userData.password !== password) {
        Alert.alert("Wrong Password ❌", "Incorrect password. If forgot, tap 'Forgot Password?'");
        return;
      }

      Alert.alert("Success 👍", `Welcome back, ${userData.fullName || "Worker"}!`, [
        {
          text: "OK",
          onPress: () =>
            router.replace({
              pathname: "/screen/WorkerDashboard",
              params: {
                phone: cleanPhone,
                name: userData.fullName,
                skill: userData.skillCategory || "Worker",
              },
            }),
        },
      ]);
    } catch (error: any) {
      setLoading(false);
      const errorMsg = parseAuthErrorMessage(error);
      Alert.alert(
        "Login Error ❌",
        errorMsg || "Unable to connect to database. Please check your connection."
      );
    }
  };

  // Real SMS OTP via 2Factor for Reset Password
  const handleSendResetOTP = async () => {
    const cleanPhone = resetPhone.replace(/[^0-9]/g, "").slice(-10);
    if (cleanPhone.length !== 10) {
      Alert.alert("Invalid Number", "Enter a valid 10-digit registered mobile number.");
      return;
    }

    setLoading(true);
    try {
      try {
        const workerId = `WORKER_${cleanPhone}`;
        const userSnap = await getDoc(doc(db, "users", workerId));

        if (!userSnap.exists()) {
          setLoading(false);
          Alert.alert("Not Registered ❌", "This mobile number is not registered. Please Register first!");
          return;
        }
      } catch (dbErr: any) {
        console.warn("Firestore reset pre-check notice:", dbErr?.message);
      }

      await sendFirebaseOtp(cleanPhone);
      setOtpSent(true);
      setResendTimer(60);
      setLoading(false);

      Alert.alert(
        "SMS OTP Dispatched 📱",
        `A 6-digit password reset OTP has been sent via SMS to +91 ${cleanPhone}.`
      );
    } catch (error: any) {
      setLoading(false);
      const errorMsg = parseAuthErrorMessage(error);
      Alert.alert("Failed to Send SMS OTP ❌", errorMsg);
    }
  };

  const handleResetPassword = async () => {
    const cleanOtp = resetOtp.trim().replace(/[^0-9]/g, "");
    if (cleanOtp.length !== 6) {
      Alert.alert("Invalid OTP", "Please enter the 6-digit OTP received via SMS.");
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert("Weak Password", "New password must be at least 8 characters long.");
      return;
    }

    setLoading(true);
    const cleanPhone = resetPhone.replace(/[^0-9]/g, "").slice(-10);

    try {
      await verifyFirebaseOtp(cleanOtp, cleanPhone);

      const workerRef = doc(db, "users", `WORKER_${cleanPhone}`);
      await updateDoc(workerRef, { password: newPassword });

      setLoading(false);
      Alert.alert("Password Updated 🎉", "Password changed successfully! You can now log in with your new password.", [
        {
          text: "Login Now",
          onPress: () => {
            setIsForgotMode(false);
            setOtpSent(false);
            setPassword(newPassword);
            setMobileNumber(cleanPhone);
          },
        },
      ]);
    } catch (e: any) {
      setLoading(false);
      const errorMsg = parseAuthErrorMessage(e);
      Alert.alert("Reset Failed ❌", errorMsg);
    }
  };

  return (
    <LinearGradient
      colors={["#030712", "#0F172A", "#052E16", "#14532D"]}
      locations={[0, 0.4, 0.8, 1]}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor="#030712" />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <View style={styles.content}>
            <Animated.View
              style={[
                styles.animatedWrapper,
                { opacity: fadeAnim, transform: [{ translateY: translateYAnim }] },
              ]}
            >
              {/* Top Navigation Row */}
              <View style={styles.topNavRow}>
                <TouchableOpacity
                  style={styles.backRoleBtn}
                  onPress={() => router.replace("/screen/AuthSelection" as any)}
                >
                  <Text style={styles.backRoleBtnText}>← All Roles</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.switchRoleBadge}
                  onPress={() => router.replace("/screen/CompanyLogin")}
                >
                  <Text style={styles.switchRoleBadgeText}>🏢 Company Login →</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.headerContainer}>
                <View style={styles.logoBadge}>
                  <Image
                    source={require("../../../assets/images/rozkaam-logo.jpg")}
                    style={styles.logoImage}
                    resizeMode="contain"
                  />
                </View>
                <Text style={styles.title}>
                  {isForgotMode ? "Reset Password" : "Worker Login"}
                </Text>
                <Text style={styles.subtitle}>
                  {isForgotMode
                    ? "Verify mobile number via SMS OTP to set a new password"
                    : "Access daily job opportunities near you • Aaj Kaam, Aaj Paisa"}
                </Text>
              </View>

              <View style={styles.glassCard}>
                {!isForgotMode ? (
                  <>
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Mobile Number</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Enter 10-digit number"
                        placeholderTextColor="#64748B"
                        keyboardType="numeric"
                        maxLength={10}
                        value={mobileNumber}
                        onChangeText={setMobileNumber}
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Password</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Minimum 8 characters"
                        placeholderTextColor="#64748B"
                        secureTextEntry={!showPassword}
                        value={password}
                        onChangeText={setPassword}
                      />
                      <View style={styles.rowBtn}>
                        <TouchableOpacity onPress={() => setIsForgotMode(true)}>
                          <Text style={styles.forgotText}>Forgot Password?</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                          <Text style={styles.togglePasswordText}>
                            {showPassword ? "Hide" : "Show"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <TouchableOpacity
                      activeOpacity={0.85}
                      style={styles.loginBtn}
                      onPress={handleLogin}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <Text style={styles.loginBtnText}>LOGIN</Text>
                      )}
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Registered Worker Mobile</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="10-digit mobile number"
                        placeholderTextColor="#64748B"
                        keyboardType="numeric"
                        maxLength={10}
                        value={resetPhone}
                        onChangeText={setResetPhone}
                        editable={!otpSent}
                      />
                    </View>

                    {otpSent && (
                      <>
                        <View style={styles.inputGroup}>
                          <Text style={styles.label}>Enter 6-Digit SMS OTP</Text>
                          <TextInput
                            style={styles.otpInput}
                            placeholder="• • • • • •"
                            placeholderTextColor="#64748B"
                            keyboardType="numeric"
                            maxLength={6}
                            value={resetOtp}
                            onChangeText={setResetOtp}
                          />
                          <View style={styles.resendRow}>
                            <Text style={styles.resendInfo}>
                              Didn't receive SMS OTP?{" "}
                            </Text>
                            <TouchableOpacity
                              disabled={resendTimer > 0 || loading}
                              onPress={handleSendResetOTP}
                            >
                              <Text
                                style={[
                                  styles.resendLink,
                                  (resendTimer > 0 || loading) && styles.resendDisabled,
                                ]}
                              >
                                {resendTimer > 0
                                  ? `Resend in ${resendTimer}s`
                                  : "Resend OTP"}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>

                        <View style={styles.inputGroup}>
                          <Text style={styles.label}>Enter New Password</Text>
                          <TextInput
                            style={styles.input}
                            placeholder="At least 8 characters"
                            placeholderTextColor="#64748B"
                            secureTextEntry
                            value={newPassword}
                            onChangeText={setNewPassword}
                          />
                        </View>
                      </>
                    )}

                    <TouchableOpacity
                      activeOpacity={0.85}
                      style={styles.loginBtn}
                      onPress={otpSent ? handleResetPassword : handleSendResetOTP}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <Text style={styles.loginBtnText}>
                          {otpSent ? "UPDATE PASSWORD 👍" : "SEND RESET OTP 📱"}
                        </Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{ marginTop: 14, alignItems: "center" }}
                      onPress={() => setIsForgotMode(false)}
                    >
                      <Text style={{ color: "#94A3B8", fontWeight: "600" }}>← Back to Login</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>

              <View style={styles.footerContainer}>
                <TouchableOpacity onPress={() => router.push("/screen/WorkerRegister")}>
                  <Text style={styles.linkText}>Create New Account</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: 24 },
  keyboardView: { flex: 1 },
  content: { flex: 1, justifyContent: "center" },
  animatedWrapper: { width: "100%" },
  topNavRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  backRoleBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  backRoleBtnText: { color: "#CBD5E1", fontSize: 12, fontWeight: "700" },
  switchRoleBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "rgba(37, 99, 235, 0.25)",
    borderWidth: 1,
    borderColor: "rgba(96, 165, 250, 0.4)",
  },
  switchRoleBadgeText: { color: "#93C5FD", fontSize: 12, fontWeight: "700" },
  headerContainer: { marginBottom: 20, alignItems: "center" },
  logoBadge: {
    width: 76,
    height: 76,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    padding: 5,
    marginBottom: 14,
    shadowColor: "#4ADE80",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
    overflow: "hidden",
  },
  logoImage: {
    width: "100%",
    height: "100%",
    borderRadius: 14,
  },
  title: { color: "#FFFFFF", fontSize: 32, fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { color: "#94A3B8", fontSize: 13, textAlign: "center", marginTop: 6 },
  glassCard: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  inputGroup: { marginBottom: 18 },
  label: { color: "#CBD5E1", fontSize: 13, fontWeight: "600", marginBottom: 8 },
  input: {
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#FFFFFF",
    fontSize: 16,
  },
  otpInput: {
    backgroundColor: "rgba(5, 46, 22, 0.8)",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#4ADE80",
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 6,
    textAlign: "center",
  },
  resendRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  resendInfo: { color: "#94A3B8", fontSize: 13 },
  resendLink: { color: "#4ADE80", fontSize: 13, fontWeight: "700" },
  resendDisabled: { color: "#64748B" },
  rowBtn: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  forgotText: { color: "#4ADE80", fontSize: 13, fontWeight: "600" },
  togglePasswordText: { color: "#4ADE80", fontSize: 13, fontWeight: "600" },
  loginBtn: {
    backgroundColor: "#16A34A",
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 12,
    alignItems: "center",
  },
  loginBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  footerContainer: { alignItems: "center", marginTop: 28 },
  linkText: { color: "#4ADE80", fontSize: 15, fontWeight: "700" },
});