import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { checkInWorker } from "../../services/attendanceService";
import { getCurrentLocation } from "../../hooks/useLocation";

export default function JobDetailsScreen() {
  const params = useLocalSearchParams();
  const jobId = (params.jobId as string) || "demo_job";
  const userPhone = (params.phone as string) || "9876543210";
  const jobTitle = (params.title as string) || "Editor";
  const companyName = (params.companyName as string) || "News22bharat";
  const dailyPay = (params.dailyPay as string) || "₹500";
  const location = (params.location as string) || "Birgaon";
  const statusParam = (params.status as string) || "OPEN";

  const [isAccepted, setIsAccepted] = useState(
    statusParam === "HIRED" || statusParam === "ACCEPTED"
  );
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  // Apply Job
  const handleApply = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setIsAccepted(true);
      Alert.alert("APPLIED 👍", "Job Application submitted successfully!");
    }, 1000);
  };

  // QR Scan & Location Attendance Verification
  const handleScanAndCheckIn = async () => {
    setShowQrModal(false);
    setLoading(true);

    try {
      const loc = await getCurrentLocation();
      const lat = loc ? loc.latitude : 21.2514;
      const lng = loc ? loc.longitude : 81.6296;

      const res = await checkInWorker({
        workerId: userPhone,
        companyId: companyName,
        jobId: jobId,
        latitude: lat,
        longitude: lng,
      });

      setLoading(false);

      if (res.alreadyMarked) {
        setIsCheckedIn(true);
        Alert.alert("Attendance already marked.");
      } else if (res.success) {
        setIsCheckedIn(true);
        Alert.alert("CHECK-IN SUCCESSFUL 🎉", "Attendance marked successfully!");
      } else {
        Alert.alert("CHECK-IN FAILED", "Unable to verify check-in.");
      }
    } catch (e) {
      setLoading(false);
      Alert.alert("Error ❌", "Something went wrong during check-in.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Job Details</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Main Job Overview Card */}
        <View style={styles.mainCard}>
          <Text style={styles.jobTitle}>{jobTitle}</Text>
          <Text style={styles.companyName}>{companyName}</Text>

          <View style={styles.payBox}>
            <Text style={styles.payAmount}>{dailyPay}</Text>
            <Text style={styles.paySub}>/ Day</Text>
          </View>
        </View>

        {/* Requirements Details */}
        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Requirement Details</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Category:</Text>
            <Text style={styles.detailValue}>Construction Helper</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Shift Schedule:</Text>
            <Text style={styles.detailValue}>9:00 AM - 6:00 PM</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Workers Needed:</Text>
            <Text style={styles.detailValue}>1 Personnel</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Work Location:</Text>
            <Text style={styles.detailValue}>{location}</Text>
          </View>
        </View>

        {/* Actions Area */}
        {!isAccepted ? (
          <TouchableOpacity
            style={styles.applyBtn}
            onPress={handleApply}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.applyBtnText}>APPLY NOW 👍</Text>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.acceptedContainer}>
            {/* Accepted Badge */}
            <View style={styles.acceptedBadge}>
              <Text style={styles.acceptedBadgeText}>ACCEPTED 👍</Text>
            </View>

            {/* Check-In / QR Scan Section */}
            {!isCheckedIn ? (
              <TouchableOpacity
                style={styles.qrCheckInBtn}
                onPress={() => setShowQrModal(true)}
              >
                <Text style={styles.qrCheckInText}>📷 SCAN QR CODE TO CHECK-IN</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.checkedInBadge}>
                <Text style={styles.checkedInText}>CHECKED IN FOR TODAY ✅</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* QR Code Scanner Modal */}
      <Modal visible={showQrModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.qrCard}>
            <Text style={styles.qrTitle}>Scan Company QR Code</Text>
            <Text style={styles.qrSub}>Point camera at the employer's QR badge at job site</Text>

            {/* Simulated Scanner Viewfinder */}
            <View style={styles.viewFinder}>
              <Text style={styles.finderText}>[ 📷 Camera Viewfinder ]</Text>
            </View>

            <TouchableOpacity
              style={styles.simulatedScanBtn}
              onPress={handleScanAndCheckIn}
            >
              <Text style={styles.simulatedScanText}>SCAN & VERIFY ATTENDANCE 👍</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeModalBtn}
              onPress={() => setShowQrModal(false)}
            >
              <Text style={styles.closeModalText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
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
  backBtn: { paddingVertical: 4, paddingHorizontal: 8 },
  backBtnText: { fontSize: 15, fontWeight: "700", color: "#16A34A" },
  headerTitle: { fontSize: 16, fontWeight: "800", color: "#0F172A" },
  content: { padding: 20 },
  mainCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 16,
  },
  jobTitle: { fontSize: 22, fontWeight: "900", color: "#0F172A" },
  companyName: { fontSize: 14, color: "#64748B", marginTop: 2, fontWeight: "600" },
  payBox: {
    backgroundColor: "#F0FDF4",
    borderRadius: 14,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  payAmount: { fontSize: 28, fontWeight: "900", color: "#16A34A" },
  paySub: { fontSize: 12, color: "#16A34A", fontWeight: "700" },
  detailsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 20,
  },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#0F172A", marginBottom: 14 },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  detailLabel: { fontSize: 13, color: "#64748B", fontWeight: "600" },
  detailValue: { fontSize: 13, color: "#0F172A", fontWeight: "800" },
  applyBtn: {
    backgroundColor: "#16A34A",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  applyBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  acceptedContainer: { gap: 12 },
  acceptedBadge: {
    backgroundColor: "#16A34A",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  acceptedBadgeText: { color: "#FFFFFF", fontSize: 16, fontWeight: "900" },
  qrCheckInBtn: {
    backgroundColor: "#2563EB",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  qrCheckInText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
  checkedInBadge: {
    backgroundColor: "#DCFCE7",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#86EFAC",
  },
  checkedInText: { color: "#15803D", fontSize: 14, fontWeight: "900" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    justifyContent: "center",
    padding: 24,
  },
  qrCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
  },
  qrTitle: { fontSize: 18, fontWeight: "900", color: "#0F172A" },
  qrSub: { fontSize: 12, color: "#64748B", textAlign: "center", marginTop: 4, marginBottom: 16 },
  viewFinder: {
    width: 200,
    height: 200,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#2563EB",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    marginBottom: 20,
  },
  finderText: { fontSize: 12, color: "#64748B", fontWeight: "600" },
  simulatedScanBtn: {
    backgroundColor: "#16A34A",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  simulatedScanText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  closeModalBtn: { marginTop: 12, paddingVertical: 8 },
  closeModalText: { color: "#64748B", fontSize: 13, fontWeight: "700" },
});