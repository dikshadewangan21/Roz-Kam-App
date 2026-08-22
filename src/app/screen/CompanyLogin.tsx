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

export default function CompanyLoginScreen() {
  const [emailOrPhone, setEmailOrPhone] = useState("");
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
    const inputVal = emailOrPhone.trim();
    if (!inputVal) {
      Alert.alert("Input Required", "Please enter company mobile number or email.");
      return;
    }
    if (password.length < 8) {
      Alert.alert("Invalid Password", "Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);

    try {
      const cleanPhone = inputVal.replace(/[^0-9]/g, "").slice(-10);

      // Check in companies collection first, then users collection
      let docRef = doc(db, "companies", cleanPhone);
      let docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        docRef = doc(db, "users", `COMPANY_${cleanPhone}`);
        docSnap = await getDoc(docRef);
      }

      setLoading(false);

      if (!docSnap.exists()) {
        Alert.alert(
          "Account Not Registered ❌",
          "No account found with this number. Pehle Register Karo!",
          [
            { text: "Register Now", onPress: () => router.push("/screen/CompanyRegister") },
            { text: "Cancel", style: "cancel" },
          ]
        );
        return;
      }

      const data = docSnap.data();

      if (data.password && data.password !== password) {
        Alert.alert("Wrong Password ❌", "Incorrect password. Agar bhool gaye hain toh 'Forgot Password?' par click karein.");
        return;
      }

      const companyName = data.companyName || "Company";
      const phone = data.mobileNumber || data.phone || cleanPhone;
      const email = data.emailAddress || (inputVal.includes("@") ? inputVal : "");

      Alert.alert("Success 👍", `Welcome back, ${companyName}!`, [
        {
          text: "OK",
          onPress: () =>
            router.replace({
              pathname: "/screen/CompanyDashboard",
              params: { companyName, phone, email },
            }),
        },
      ]);
    } catch (error) {
      setLoading(false);
      Alert.alert(
        "Account Not Found ❌",
        "Aapka account register nahi mila. Pehle Register karo!",
        [
          { text: "Register Now", onPress: () => router.push("/screen/CompanyRegister") },
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
    let docRef = doc(db, "companies", cleanPhone);
    let docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      docRef = doc(db, "users", `COMPANY_${cleanPhone}`);
      docSnap = await getDoc(docRef);
    }

    setLoading(false);

    if (!docSnap.exists()) {
      Alert.alert("Not Registered ❌", "Yeh number registered nahi hai. Pehle register karo!");
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
      const compRef = doc(db, "companies", cleanPhone);
      const userRef = doc(db, "users", `COMPANY_${cleanPhone}`);

      await updateDoc(compRef, { password: newPassword }).catch(() => {});
      await updateDoc(userRef, { password: newPassword }).catch(() => {});

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
                  {isForgotMode ? "Reset Password" : "Company Login"}
                </Text>
                <Text style={styles.subtitle}>
                  {isForgotMode
                    ? "Verify mobile number to set a new password"
                    : "Hire verified workforce for your business instantly"}
                </Text>
              </View>

              <View style={styles.glassCard}>
                {!isForgotMode ? (
                  <>
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Company Email or Phone</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="e.g. 9876543210 or company@domain.com"
                        placeholderTextColor="#64748B"
                        value={emailOrPhone}
                        onChangeText={setEmailOrPhone}
                        autoCapitalize="none"
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
                        <Text style={styles.loginBtnText}>COMPANY LOGIN</Text>
                      )}
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Registered Company Mobile</Text>
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
                <Text style={styles.footerText}>New to RozKaam? </Text>
                <TouchableOpacity onPress={() => router.push("/screen/CompanyRegister")}>
                  <Text style={styles.linkText}>Register Company</Text>
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
  forgotText: { color: "#60A5FA", fontSize: 13, fontWeight: "600" },
  togglePasswordText: { color: "#4ADE80", fontSize: 13, fontWeight: "600" },
  loginBtn: {
    backgroundColor: "#2563EB",
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 12,
    alignItems: "center",
  },
  loginBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  footerContainer: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 28 },
  footerText: { color: "#94A3B8", fontSize: 14 },
  linkText: { color: "#60A5FA", fontSize: 14, fontWeight: "700" },
});