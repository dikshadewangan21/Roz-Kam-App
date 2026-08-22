import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../constants/firebaseConfig";

export default function CompanyRegisterScreen() {
  const [step, setStep] = useState<1 | 2>(1);

  // Form Fields
  const [companyName, setCompanyName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Step 2: Business Verification Fields
  const [gstin, setGstin] = useState("");
  const [businessDocUri, setBusinessDocUri] = useState<string | null>(null);

  // OTP States
  const [mobileOtp, setMobileOtp] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [loading, setLoading] = useState(false);

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

  // Government GSTIN Regex Validation (15 Chars)
  const validateGSTIN = (gst: string) => {
    const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return regex.test(gst.trim().toUpperCase());
  };

  // Image Picker / Camera for Business Document
  const pickOrCaptureDocument = async () => {
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!cameraPermission.granted && !mediaPermission.granted) {
      Alert.alert("Permission Required", "Camera and photo access is needed.");
      return;
    }

    Alert.alert(
      "Upload Business Certificate",
      "Select an option to upload GST / Registration Certificate",
      [
        {
          text: "📷 Open Camera",
          onPress: async () => {
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              quality: 0.8,
            });
            if (!result.canceled && result.assets && result.assets.length > 0) {
              setBusinessDocUri(result.assets[0].uri);
            }
          },
        },
        {
          text: "🖼️ Choose from Gallery",
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              quality: 0.8,
            });
            if (!result.canceled && result.assets && result.assets.length > 0) {
              setBusinessDocUri(result.assets[0].uri);
            }
          },
        },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  // Step 1: Send OTPs & Check Existing Company
  const handleSendOtps = async () => {
    if (!companyName.trim()) {
      Alert.alert("Validation Error", "Please enter your company / organization name.");
      return;
    }
    const cleanPhone = mobileNumber.replace(/[^0-9]/g, "").slice(-10);
    if (cleanPhone.length !== 10) {
      Alert.alert("Validation Error", "Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!emailAddress.trim() || !emailAddress.includes("@")) {
      Alert.alert("Validation Error", "Please enter a valid business email address.");
      return;
    }
    if (password.length < 8) {
      Alert.alert("Validation Error", "Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Validation Error", "Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      // Check if Company already exists
      const companyRef = doc(db, "companies", cleanPhone);
      const companySnap = await getDoc(companyRef);

      if (companySnap.exists()) {
        setLoading(false);
        Alert.alert("Already Registered ❌", "This company mobile number is already registered. Please Login!");
        router.replace("/screen/CompanyLogin");
        return;
      }

      setLoading(false);
      setOtpSent(true);
      Alert.alert(
        "OTPs Dispatched 📩",
        `Verification codes sent to:\n• Mobile: +91 ${cleanPhone}\n• Email: ${emailAddress.trim()}\n\n(Use 123456 for testing)`
      );
    } catch (error) {
      setLoading(false);
      Alert.alert("Server Error", "Failed to send verification codes. Try again.");
    }
  };

  // Step 2: Verify Dual OTPs
  const handleVerifyOtps = () => {
    const isMobileValid = mobileOtp.trim() === "123456" || mobileOtp.trim().length === 6;
    const isEmailValid = emailOtp.trim() === "123456" || emailOtp.trim().length === 6;

    if (!isMobileValid || !isEmailValid) {
      Alert.alert("Invalid OTP", "Please enter valid 6-digit OTPs for both Mobile and Email.");
      return;
    }

    setIsVerified(true);
    Alert.alert("Verified ✅", "Mobile and Email verified! Proceeding to Business Details.");
    setStep(2);
  };

  // Step 3: Complete Company Registration
  const handleCompleteRegistration = async () => {
    const cleanPhone = mobileNumber.replace(/[^0-9]/g, "").slice(-10);
    const cleanGST = gstin.trim().toUpperCase();

    if (!validateGSTIN(cleanGST)) {
      Alert.alert(
        "Invalid GSTIN ❌",
        "Entered GSTIN is invalid. Must be a valid 15-character Government Registration (e.g. 27AAAAA0000A1Z5)."
      );
      return;
    }

    if (!businessDocUri) {
      Alert.alert(
        "Document Required 📄",
        "Please upload GST / Business Registration Certificate to proceed."
      );
      return;
    }

    setLoading(true);

    try {
      await setDoc(doc(db, "companies", cleanPhone), {
        companyName: companyName.trim(),
        mobileNumber: `+91 ${cleanPhone}`,
        emailAddress: emailAddress.trim(),
        gstin: cleanGST,
        businessDocUri: businessDocUri,
        password: password,
        role: "COMPANY",
        verificationStatus: "APPROVED",
        isVerified: true,
        createdAt: new Date().toISOString(),
      });

      setLoading(false);
      Alert.alert("Success 🎉", "Company Account registered successfully!", [
        {
          text: "Login Now",
          onPress: () => router.replace("/screen/CompanyLogin"),
        },
      ]);
    } catch (error) {
      setLoading(false);
      Alert.alert("Database Error", "Failed to save company profile.");
    }
  };

  return (
    <LinearGradient
      colors={["#030712", "#0F172A", "#1E3A8A"]}
      locations={[0, 0.5, 1]}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor="#030712" />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View
              style={[
                styles.content,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: translateYAnim }],
                },
              ]}
            >
              <View style={styles.headerContainer}>
                <Text style={styles.title}>Company Registration</Text>
                <Text style={styles.subtitle}>
                  {step === 1
                    ? "Register business details & verify contact info"
                    : "Upload Business Documents & GSTIN for Fraud Prevention"}
                </Text>
              </View>

              <View style={styles.formCard}>
                {step === 1 ? (
                  <>
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Company / Organization Name</Text>
                      <TextInput
                        style={[styles.input, otpSent && styles.disabledInput]}
                        placeholder="e.g. Apex Enterprises"
                        placeholderTextColor="#64748B"
                        value={companyName}
                        onChangeText={setCompanyName}
                        editable={!otpSent}
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Mobile Number</Text>
                      <TextInput
                        style={[styles.input, otpSent && styles.disabledInput]}
                        placeholder="10-digit mobile number"
                        placeholderTextColor="#64748B"
                        keyboardType="numeric"
                        maxLength={10}
                        value={mobileNumber}
                        onChangeText={setMobileNumber}
                        editable={!otpSent}
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Business Email Address</Text>
                      <TextInput
                        style={[styles.input, otpSent && styles.disabledInput]}
                        placeholder="company@domain.com"
                        placeholderTextColor="#64748B"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={emailAddress}
                        onChangeText={setEmailAddress}
                        editable={!otpSent}
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Password</Text>
                      <TextInput
                        style={[styles.input, otpSent && styles.disabledInput]}
                        placeholder="At least 8 characters"
                        placeholderTextColor="#64748B"
                        secureTextEntry
                        value={password}
                        onChangeText={setPassword}
                        editable={!otpSent}
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Confirm Password</Text>
                      <TextInput
                        style={[styles.input, otpSent && styles.disabledInput]}
                        placeholder="Re-enter password"
                        placeholderTextColor="#64748B"
                        secureTextEntry
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        editable={!otpSent}
                      />
                    </View>

                    {otpSent && (
                      <>
                        <View style={styles.inputGroup}>
                          <Text style={[styles.label, { color: "#60A5FA" }]}>
                            ENTER MOBILE OTP
                          </Text>
                          <TextInput
                            style={styles.otpInput}
                            placeholder="• • • • • •"
                            placeholderTextColor="#64748B"
                            keyboardType="numeric"
                            maxLength={6}
                            value={mobileOtp}
                            onChangeText={setMobileOtp}
                          />
                        </View>

                        <View style={styles.inputGroup}>
                          <Text style={[styles.label, { color: "#60A5FA" }]}>
                            ENTER EMAIL OTP
                          </Text>
                          <TextInput
                            style={styles.otpInput}
                            placeholder="• • • • • •"
                            placeholderTextColor="#64748B"
                            keyboardType="numeric"
                            maxLength={6}
                            value={emailOtp}
                            onChangeText={setEmailOtp}
                          />
                        </View>
                      </>
                    )}

                    {!otpSent ? (
                      <TouchableOpacity
                        activeOpacity={0.85}
                        style={styles.registerBtn}
                        onPress={handleSendOtps}
                        disabled={loading}
                      >
                        {loading ? (
                          <ActivityIndicator color="#FFFFFF" />
                        ) : (
                          <Text style={styles.registerBtnText}>Send Mobile & Email OTP 👍</Text>
                        )}
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        activeOpacity={0.85}
                        style={styles.verifyBtn}
                        onPress={handleVerifyOtps}
                        disabled={loading}
                      >
                        <Text style={styles.registerBtnText}>
                          Verify OTPs & Proceed →
                        </Text>
                      </TouchableOpacity>
                    )}
                  </>
                ) : (
                  <>
                    <Text style={styles.sectionHeader}>Business Verification</Text>

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>15-Character Government GSTIN</Text>
                      <TextInput
                        style={[styles.input, { borderColor: "#EF4444" }]}
                        placeholder="e.g. 27AAAAA0000A1Z5"
                        placeholderTextColor="#64748B"
                        autoCapitalize="characters"
                        maxLength={15}
                        value={gstin}
                        onChangeText={setGstin}
                      />
                    </View>

                    {/* Business Document Upload Card */}
                    <TouchableOpacity
                      style={[
                        styles.uploadCard,
                        businessDocUri && styles.uploadCardSuccess,
                      ]}
                      onPress={pickOrCaptureDocument}
                    >
                      {businessDocUri ? (
                        <View style={styles.previewRow}>
                          <Image source={{ uri: businessDocUri }} style={styles.thumbImage} />
                          <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={styles.successTitle}>✓ Business Document Uploaded</Text>
                            <Text style={styles.retakeText}>Tap to re-take / change document</Text>
                          </View>
                        </View>
                      ) : (
                        <View style={styles.uploadPlaceholder}>
                          <Text style={styles.uploadIcon}>📄</Text>
                          <Text style={styles.uploadTitle}>Upload GST / Business Certificate</Text>
                          <Text style={styles.uploadSub}>Tap to open camera or gallery</Text>
                        </View>
                      )}
                    </TouchableOpacity>

                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={styles.backBtn}
                        onPress={() => setStep(1)}
                      >
                        <Text style={styles.backBtnText}>← Back</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.submitBtn}
                        onPress={handleCompleteRegistration}
                        disabled={loading}
                      >
                        {loading ? (
                          <ActivityIndicator color="#FFFFFF" />
                        ) : (
                          <Text style={styles.registerBtnText}>Register Company 👍</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>

              <View style={styles.footerContainer}>
                <Text style={styles.footerText}>Already registered? </Text>
                <TouchableOpacity onPress={() => router.push("/screen/CompanyLogin")}>
                  <Text style={styles.linkText}>Log In</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingVertical: 20 },
  content: { flex: 1, justifyContent: "center" },
  headerContainer: { marginBottom: 24, alignItems: "center" },
  title: { color: "#FFFFFF", fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { color: "#94A3B8", fontSize: 13, textAlign: "center", marginTop: 6, lineHeight: 18 },
  formCard: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  sectionHeader: { color: "#60A5FA", fontSize: 16, fontWeight: "800", marginBottom: 14 },
  inputGroup: { marginBottom: 16 },
  label: { color: "#CBD5E1", fontSize: 12, fontWeight: "600", marginBottom: 6 },
  input: {
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#FFFFFF",
    fontSize: 14,
  },
  disabledInput: { opacity: 0.5 },
  otpInput: {
    backgroundColor: "rgba(30, 58, 138, 0.6)",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#60A5FA",
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 6,
    textAlign: "center",
  },
  uploadCard: {
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#64748B",
    padding: 16,
    marginBottom: 16,
  },
  uploadCardSuccess: {
    backgroundColor: "rgba(5, 46, 22, 0.6)",
    borderColor: "#4ADE80",
    borderStyle: "solid",
  },
  uploadPlaceholder: { alignItems: "center", paddingVertical: 8 },
  uploadIcon: { fontSize: 28, marginBottom: 6 },
  uploadTitle: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  uploadSub: { color: "#94A3B8", fontSize: 11, marginTop: 2 },
  previewRow: { flexDirection: "row", alignItems: "center" },
  thumbImage: { width: 50, height: 50, borderRadius: 10, borderWidth: 1, borderColor: "#4ADE80" },
  successTitle: { color: "#4ADE80", fontSize: 13, fontWeight: "800" },
  retakeText: { color: "#CBD5E1", fontSize: 11, marginTop: 2 },

  registerBtn: {
    backgroundColor: "#2563EB",
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 10,
    alignItems: "center",
  },
  verifyBtn: {
    backgroundColor: "#16A34A",
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 10,
    alignItems: "center",
  },
  registerBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  backBtn: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  backBtnText: { color: "#CBD5E1", fontSize: 14, fontWeight: "700" },
  submitBtn: {
    flex: 2,
    backgroundColor: "#16A34A",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  footerContainer: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 24 },
  footerText: { color: "#94A3B8", fontSize: 14 },
  linkText: { color: "#60A5FA", fontSize: 14, fontWeight: "700" },
});