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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../constants/firebaseConfig";

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
          "No worker account registered with this number. Pehle Register Karo!",
          [
            { text: "Register Now", onPress: () => router.push("/screen/WorkerRegister") },
            { text: "Cancel", style: "cancel" },
          ]
        );
        return;
      }

      const userData = userSnap.data();

      if (userData.password !== password) {
        Alert.alert("Wrong Password ❌", "Incorrect password. If forgot, click 'Forgot Password?'");
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
    } catch (error) {
      setLoading(false);
      Alert.alert(
        "Account Not Found ❌",
        "Aapka account register nahi mila. Pehle Register karo!",
        [
          { text: "Register Now", onPress: () => router.push("/screen/WorkerRegister") },
          { text: "Try Again", style: "cancel" },
        ]
      );
    }
  };

  // Forgot Password Actions
  const handleSendResetOTP = async () => {
    const cleanPhone = resetPhone.replace(/[^0-9]/g, "").slice(-10);
    if (cleanPhone.length !== 10) {
      Alert.alert("Invalid Number", "Enter a valid 10-digit registered mobile number.");
      return;
    }

    setLoading(true);
    const workerId = `WORKER_${cleanPhone}`;
    const userSnap = await getDoc(doc(db, "users", workerId));
    setLoading(false);

    if (!userSnap.exists()) {
      Alert.alert("Not Registered ❌", "Yeh mobile number registered nahi hai. Pehle Register karo!");
      return;
    }

    setOtpSent(true);
    Alert.alert("OTP Sent 📱", `OTP sent to +91 ${cleanPhone}. (Use 123456 for testing)`);
  };

  const handleResetPassword = async () => {
    if (resetOtp.trim() !== "123456") {
      Alert.alert("Invalid OTP", "Please enter correct 6-digit OTP.");
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert("Weak Password", "New password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    const cleanPhone = resetPhone.replace(/[^0-9]/g, "").slice(-10);

    try {
      const workerRef = doc(db, "users", `WORKER_${cleanPhone}`);
      await updateDoc(workerRef, { password: newPassword });

      setLoading(false);
      Alert.alert("Password Updated 🎉", "Password changed successfully! Ab naye password se login karo.", [
        {
          text: "Login Now",
          onPress: () => {
            setIsForgotMode(false);
            setOtpSent(false);
          },
        },
      ]);
    } catch (e) {
      setLoading(false);
      Alert.alert("Error", "Failed to update password. Try again.");
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
              <View style={styles.headerContainer}>
                <Text style={styles.title}>
                  {isForgotMode ? "Reset Password" : "Worker Login"}
                </Text>
                <Text style={styles.subtitle}>
                  {isForgotMode
                    ? "Verify mobile number to set a new password"
                    : "Access daily job opportunities near you"}
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
                          <Text style={styles.label}>Enter 6-Digit OTP</Text>
                          <TextInput
                            style={styles.input}
                            placeholder="123456"
                            placeholderTextColor="#64748B"
                            keyboardType="numeric"
                            maxLength={6}
                            value={resetOtp}
                            onChangeText={setResetOtp}
                          />
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
  headerContainer: { marginBottom: 28, alignItems: "center" },
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