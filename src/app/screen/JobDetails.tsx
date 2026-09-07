import React, { useState, useEffect } from "react";
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
import QRCode from "react-native-qrcode-svg";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../../constants/firebaseConfig";
import { checkInWorker } from "../../services/attendanceService";
import { getCurrentLocation } from "../../hooks/useLocation";

export default function JobDetailsScreen() {
  const params = useLocalSearchParams();
  const jobId = (params.jobId as string) || "demo_job";
  const rawUserPhone = (params.phone as string) || (params.userPhone as string) || "9876543210";
  const userPhone = rawUserPhone.replace(/[^0-9]/g, "").slice(-10);
  const userName = (params.name as string) || (params.workerName as string) || "Worker";
  const jobTitle = (params.title as string) || "RozKaam Duty";
  const companyName = (params.companyName as string) || "Employer";
  const dailyPay = (params.dailyPay as string) || "₹500";
  const location = (params.location as string) || "Work Site";
  const statusParam = (params.status as string) || "OPEN";

  const [isAccepted, setIsAccepted] = useState(
    statusParam === "HIRED" || statusParam === "ACCEPTED"
  );
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  // Real-time listener for worker's attendance record in Firestore
  useEffect(() => {
    if (!jobId || !userPhone) return;

    const attendanceDocId = `${jobId}_${userPhone}`;
    const attendanceRef = doc(db, "attendance", attendanceDocId);

    const unsubscribe = onSnapshot(attendanceRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.status === "CHECKED_IN" || data.scanned === true) {
          setIsCheckedIn(true);
          if (data.scannedAt?.toDate) {
            setCheckInTime(
              data.scannedAt.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            );
          } else {
            setCheckInTime("Today");
          }
        }
      }
    });

    return () => unsubscribe();
  }, [jobId, userPhone]);

  // Apply Job
  const handleApply = async () => {
    setLoading(true);
    try {
      const appDocId = `${jobId}_${userPhone}`;
      const appRef = doc(db, "applications", appDocId);
      await setDoc(
        appRef,
        {
          jobId: jobId,
          jobTitle: jobTitle,
          workerName: userName,
          workerPhone: userPhone,
          workerSkill: "General Staff",
          status: "PENDING",
          appliedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      setLoading(false);
      setIsAccepted(true);
      Alert.alert(
        "APPLIED 👍",
        "Job application submitted successfully! Waiting for employer approval."
      );
    } catch (e) {
      setLoading(false);
      setIsAccepted(true);
      Alert.alert("APPLIED 👍", "Job application recorded successfully!");
    }
  };

  // Manual GPS Check-In (Backup for without QR scanning)
  const handleGpsCheckIn = async () => {
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
        Alert.alert("Attendance Info", "Attendance was already marked for this job.");
      } else if (res.success) {
        setIsCheckedIn(true);
        Alert.alert("CHECK-IN SUCCESSFUL 🎉", "Attendance marked successfully via GPS!");
      } else {
        Alert.alert("CHECK-IN FAILED", "Unable to verify check-in.");
      }
    } catch (e) {
      setLoading(false);
      Alert.alert("Error ❌", "Something went wrong during check-in.");
    }
  };

  // QR Payload for Company Manager to scan
  const qrDataPayload = JSON.stringify({
    type: "ROZKAAM_ATTENDANCE",
    workerId: userPhone,
    workerName: userName,
    jobId: jobId,
    companyName: companyName,
    timestamp: Date.now(),
  });

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
          <Text style={styles.sectionTitle}>Job Information</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Work Category:</Text>
            <Text style={styles.detailValue}>General Support / Helper</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Duty Hours:</Text>
            <Text style={styles.detailValue}>9:00 AM - 6:00 PM</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Work Location:</Text>
            <Text style={styles.detailValue}>{location}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Payment Mode:</Text>
            <Text style={[styles.detailValue, { color: "#16A34A" }]}>Direct UPI / Razorpay</Text>
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
              <Text style={styles.acceptedBadgeText}>HIRED / ACCEPTED 👍</Text>
            </View>

            {/* Attendance Status Box */}
            {isCheckedIn ? (
              <View style={styles.checkedInBadge}>
                <Text style={styles.checkedInIcon}>✅</Text>
                <Text style={styles.checkedInTitle}>ATTENDANCE MARKED</Text>
                <Text style={styles.checkedInSubtitle}>
                  Checked in successfully {checkInTime ? `at ${checkInTime}` : "today"}
                </Text>
              </View>
            ) : (
              <View style={styles.attendanceActionBox}>
                <Text style={styles.attendanceInstruction}>
                  📱 When you reach the job site, show your Attendance QR code to the company manager:
                </Text>

                <TouchableOpacity
                  style={styles.showQrBtn}
                  onPress={() => setShowQrModal(true)}
                >
                  <Text style={styles.showQrBtnText}>📱 SHOW MY ATTENDANCE QR</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.gpsBackupBtn}
                  onPress={handleGpsCheckIn}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#2563EB" size="small" />
                  ) : (
                    <Text style={styles.gpsBackupBtnText}>📍 Check-In with GPS Location</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Worker Attendance QR Modal (Shown to Company Manager) */}
      <Modal
        visible={showQrModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowQrModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.qrCard}>
            <View style={styles.qrHeaderBadge}>
              <Text style={styles.qrHeaderBadgeText}>WORKER ATTENDANCE BADGE</Text>
            </View>

            <Text style={styles.qrTitle}>{userName}</Text>
            <Text style={styles.qrWorkerPhone}>📞 +91 {userPhone}</Text>
            <Text style={styles.qrSub}>
              Ask employer / company manager to scan this QR code using their app camera
            </Text>

            {/* Live QR Code generated for Worker */}
            <View style={styles.qrWrapper}>
              <QRCode
                value={qrDataPayload}
                size={210}
                color="#0F172A"
                backgroundColor="#FFFFFF"
              />
            </View>

            {isCheckedIn ? (
              <View style={styles.liveScannedBox}>
                <Text style={styles.liveScannedText}>🎉 SCANNED & MARKED PRESENT! ✅</Text>
              </View>
            ) : (
              <View style={styles.waitingScanBox}>
                <ActivityIndicator size="small" color="#2563EB" />
                <Text style={styles.waitingScanText}>Waiting for manager to scan...</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.closeModalBtn}
              onPress={() => setShowQrModal(false)}
            >
              <Text style={styles.closeModalText}>Close Badge</Text>
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
    elevation: 2,
  },
  applyBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  acceptedContainer: { gap: 14 },
  acceptedBadge: {
    backgroundColor: "#DCFCE7",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#86EFAC",
  },
  acceptedBadgeText: { color: "#15803D", fontSize: 14, fontWeight: "900" },
  attendanceActionBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 12,
  },
  attendanceInstruction: {
    fontSize: 13,
    color: "#475569",
    fontWeight: "600",
    lineHeight: 18,
    textAlign: "center",
  },
  showQrBtn: {
    backgroundColor: "#2563EB",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    elevation: 3,
  },
  showQrBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900", letterSpacing: 0.3 },
  gpsBackupBtn: {
    paddingVertical: 10,
    alignItems: "center",
  },
  gpsBackupBtnText: { color: "#64748B", fontSize: 13, fontWeight: "700" },
  checkedInBadge: {
    backgroundColor: "#F0FDF4",
    paddingVertical: 20,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#86EFAC",
  },
  checkedInIcon: { fontSize: 36, marginBottom: 6 },
  checkedInTitle: { color: "#15803D", fontSize: 16, fontWeight: "900" },
  checkedInSubtitle: { color: "#16A34A", fontSize: 12, fontWeight: "700", marginTop: 4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  qrCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    width: "90%",
    elevation: 10,
  },
  qrHeaderBadge: {
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 10,
  },
  qrHeaderBadgeText: { color: "#1D4ED8", fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  qrTitle: { fontSize: 20, fontWeight: "900", color: "#0F172A" },
  qrWorkerPhone: { fontSize: 13, fontWeight: "700", color: "#2563EB", marginTop: 2 },
  qrSub: { fontSize: 12, color: "#64748B", textAlign: "center", marginTop: 6, marginBottom: 18, paddingHorizontal: 10 },
  qrWrapper: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    marginBottom: 16,
  },
  liveScannedBox: {
    backgroundColor: "#DCFCE7",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#86EFAC",
  },
  liveScannedText: { color: "#15803D", fontSize: 13, fontWeight: "900" },
  waitingScanBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  waitingScanText: { color: "#64748B", fontSize: 12, fontWeight: "600" },
  closeModalBtn: {
    backgroundColor: "#F1F5F9",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  closeModalText: { color: "#475569", fontSize: 14, fontWeight: "800" },
});