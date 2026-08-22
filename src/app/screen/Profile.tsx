import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StatusBar,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";

export default function ProfileScreen() {
  // Catch dynamic parameters passed from WorkerDashboard
  const params = useLocalSearchParams();

  // Worker Profile States (Dynamic Name & Phone with fallback)
  const [fullName, setFullName] = useState(
    (params.name as string) || "Ramesh Kumar"
  );
  const [phone, setPhone] = useState(
    params.phone ? `+91 ${params.phone}` : "+91 9876543210"
  );
  const [skill, setSkill] = useState(
    (params.skill as string) || "Construction Helper / Mason"
  );
  const [location, setLocation] = useState("Sector 62, Noida");

  // Verification States
  const [aadhaarInput, setAadhaarInput] = useState("");
  const [isKycVerified, setIsKycVerified] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Verification Logic (Auto-lock name to prevent fraud)
  const handleVerifyAadhaar = () => {
    if (aadhaarInput.trim().length !== 12) {
      Alert.alert("INVALID NUMBER", "Please enter a valid 12-digit number.");
      return;
    }

    setIsVerifying(true);

    setTimeout(() => {
      setIsVerifying(false);
      setIsKycVerified(true);
      setAadhaarInput("");
      Alert.alert(
        "VERIFIED 👍",
        "Identity verification successful! Name is now locked to prevent fraud."
      );
    }, 1500);
  };

  const handleSaveProfile = () => {
    setIsEditing(false);
    Alert.alert("SAVED 👍", "Profile details updated successfully.");
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account Profile</Text>
        <TouchableOpacity
          style={styles.editHeaderBtn}
          onPress={() => setIsEditing(!isEditing)}
        >
          <Text style={styles.editHeaderBtnText}>
            {isEditing ? "Cancel" : "Edit"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Main User Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {fullName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase() || "RK"}
            </Text>
          </View>

          <Text style={styles.userName}>{fullName}</Text>
          <Text style={styles.userRole}>Registered Daily Worker</Text>

          {isKycVerified ? (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>KYC VERIFIED 👍</Text>
            </View>
          ) : (
            <View style={styles.unverifiedBadge}>
              <Text style={styles.unverifiedText}>NOT VERIFIED</Text>
            </View>
          )}
        </View>

        {/* Identity Verification Section */}
        {!isKycVerified && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Identity Verification</Text>
            <Text style={styles.helperText}>
              Verify with official identity document to unlock direct payments and secure job matches.
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Enter 12-digit ID Number"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              maxLength={12}
              value={aadhaarInput}
              onChangeText={setAadhaarInput}
            />

            <TouchableOpacity
              style={styles.verifyBtn}
              onPress={handleVerifyAadhaar}
              disabled={isVerifying}
            >
              {isVerifying ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.verifyBtnText}>VERIFY IDENTITY 👍</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Personal Details */}
        <View style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.sectionTitle}>Personal Details</Text>
            {isKycVerified && (
              <Text style={styles.lockNotice}>🔒 Name locked by Verification</Text>
            )}
          </View>

          {/* Full Name (Locked if Verified to avoid fraud) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>FULL NAME</Text>
            <TextInput
              style={[
                styles.input,
                isKycVerified && styles.disabledInput,
              ]}
              value={fullName}
              onChangeText={setFullName}
              editable={!isKycVerified && isEditing}
            />
          </View>

          {/* Mobile Number */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>MOBILE NUMBER</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.readOnlyInput]}
              value={phone}
              onChangeText={setPhone}
              editable={isEditing}
              keyboardType="phone-pad"
            />
          </View>

          {/* Primary Skill */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>PRIMARY SKILL</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.readOnlyInput]}
              value={skill}
              onChangeText={setSkill}
              editable={isEditing}
            />
          </View>

          {/* Primary Location */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>PRIMARY LOCATION</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.readOnlyInput]}
              value={location}
              onChangeText={setLocation}
              editable={isEditing}
            />
          </View>

          {isEditing && (
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile}>
              <Text style={styles.saveBtnText}>SAVE CHANGES 👍</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Preferences & Support */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Settings & Preferences</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/screen/Wallet")}
          >
            <Text style={styles.menuText}>Manage Payment / Bank Account</Text>
            <Text style={styles.arrowText}>→</Text>
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => Alert.alert("Support", "24x7 Helpline: +91 1800-123-4567")}
          >
            <Text style={styles.menuText}>Help & Support (24x7)</Text>
            <Text style={styles.arrowText}>→</Text>
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuText}>Terms of Service & Privacy Policy</Text>
            <Text style={styles.arrowText}>→</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#16A34A",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  editHeaderBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  editHeaderBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#2563EB",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  avatarCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#052E16",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarText: {
    color: "#4ADE80",
    fontSize: 24,
    fontWeight: "900",
  },
  userName: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0F172A",
  },
  userRole: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "600",
  },
  verifiedBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#86EFAC",
  },
  verifiedText: {
    color: "#15803D",
    fontSize: 11,
    fontWeight: "900",
  },
  unverifiedBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 12,
  },
  unverifiedText: {
    color: "#D97706",
    fontSize: 11,
    fontWeight: "900",
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  lockNotice: {
    fontSize: 10,
    color: "#2563EB",
    fontWeight: "700",
  },
  helperText: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748B",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  readOnlyInput: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
  },
  disabledInput: {
    backgroundColor: "#F1F5F9",
    color: "#64748B",
    borderColor: "#E2E8F0",
  },
  verifyBtn: {
    backgroundColor: "#16A34A",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 6,
  },
  verifyBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  saveBtn: {
    backgroundColor: "#2563EB",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  menuText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
  },
  arrowText: {
    fontSize: 16,
    color: "#94A3B8",
    fontWeight: "800",
  },
  menuDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
  },
});