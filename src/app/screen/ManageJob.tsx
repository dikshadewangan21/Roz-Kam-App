import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  StatusBar,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Modal,
  Animated,
  Easing,
  Vibration,
  Platform,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { collection, onSnapshot, doc, updateDoc, query, where } from "firebase/firestore";
import { db } from "../../constants/firebaseConfig";
import { CameraView, useCameraPermissions } from "expo-camera";
import { processSalaryPayment } from "../../services/payment/razorpayService";
import { checkInWorker } from "../../services/attendanceService";

interface Applicant {
  id: string;
  jobId: string;
  jobTitle: string;
  workerName: string;
  workerPhone: string;
  workerSkill: string;
  status: "PENDING" | "HIRED" | "REJECTED";
  appliedAt: string;
}

interface AttendanceStatus {
  status: "CHECKED_IN" | "PENDING";
  scanned: boolean;
  time?: string;
}

export default function ManageJobScreen() {
  const params = useLocalSearchParams();
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceStatus>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [payLoading, setPayLoading] = useState<boolean>(false);
  
  // Camera Scanner States
  const [showScannerModal, setShowScannerModal] = useState<boolean>(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [scannerProcessing, setScannerProcessing] = useState<boolean>(false);

  // PhonePe Sequential Animation States
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [animStep, setAnimStep] = useState<"PROCESSING" | "TICK" | "DETAILS">("PROCESSING");
  const [successDetails, setSuccessDetails] = useState<{
    amount: number;
    workerName: string;
    txnId: string;
  }>({ amount: 0, workerName: "", txnId: "" });

  // Animation Values
  const spinValue = useRef(new Animated.Value(0)).current;
  const tickScale = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(80)).current;
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  const jobId = (params.jobId as string) || "demo_job";
  const rawCompanyPhone = (params.phone as string) || "9876543210";
  const companyPhone = rawCompanyPhone.replace(/[^0-9]/g, "").slice(-10);
  const companyName = (params.companyName as string) || "RozKaam Employer";
  
  const rawPayParam = (params.dailyPay as string) || (params.salary as string) || "500";
  const numericPay = parseInt(rawPayParam.replace(/[^0-9]/g, "")) || 500;

  // Scan Line Animation Loop
  useEffect(() => {
    if (showScannerModal) {
      scanLineAnim.setValue(0);
      const scanLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scanLineAnim, {
            toValue: 0,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      scanLoop.start();
      return () => scanLoop.stop();
    }
  }, [showScannerModal]);

  // Subscribe to Applications
  useEffect(() => {
    const appsRef = collection(db, "applications");
    const unsubscribe = onSnapshot(
      appsRef,
      (snapshot) => {
        const list: Applicant[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as Applicant[];

        const filtered = params.jobId
          ? list.filter((app) => app.jobId === params.jobId)
          : list;

        setApplicants(filtered);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching applicants:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [params.jobId]);

  // Subscribe to Attendance Collection for this Job
  useEffect(() => {
    const attendanceRef = collection(db, "attendance");
    const unsubscribe = onSnapshot(attendanceRef, (snapshot) => {
      const map: Record<string, AttendanceStatus> = {};
      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.jobId === jobId && data.workerId) {
          const cleanId = String(data.workerId).replace(/[^0-9]/g, "").slice(-10);
          map[cleanId] = {
            status: data.status || "CHECKED_IN",
            scanned: data.scanned || true,
            time: data.scannedAt?.toDate
              ? data.scannedAt.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : "Today",
          };
        }
      });
      setAttendanceMap(map);
    });

    return () => unsubscribe();
  }, [jobId]);

  // Safe Haptic Feedback
  const triggerHapticFeedback = () => {
    try {
      Vibration.vibrate(100);
    } catch (e) {
      // ignore
    }
  };

  // Open Scanner Modal with Permission Request
  const handleOpenScanner = async () => {
    if (!cameraPermission?.granted) {
      const permission = await requestCameraPermission();
      if (!permission.granted) {
        Alert.alert(
          "Camera Permission Required",
          "Please grant camera access in app permissions to scan worker attendance QR codes."
        );
        return;
      }
    }
    setScannerProcessing(false);
    setShowScannerModal(true);
  };

  // Handle QR Barcode Scanned by Camera
  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scannerProcessing) return;
    setScannerProcessing(true);

    try {
      triggerHapticFeedback();
      let workerPhoneToMark = "";
      let workerNameToMark = "Worker";

      try {
        const parsed = JSON.parse(data);
        if (parsed.workerId) {
          workerPhoneToMark = String(parsed.workerId).replace(/[^0-9]/g, "").slice(-10);
          workerNameToMark = parsed.workerName || "Worker";
        }
      } catch (parseErr) {
        workerPhoneToMark = data.replace(/[^0-9]/g, "").slice(-10);
      }

      if (!workerPhoneToMark || workerPhoneToMark.length < 10) {
        Alert.alert("Invalid QR Code ❌", "Scanned QR does not contain a valid worker phone/ID.");
        setScannerProcessing(false);
        return;
      }

      // Mark Attendance in Firestore
      const res = await checkInWorker({
        workerId: workerPhoneToMark,
        companyId: companyName,
        jobId: jobId,
        latitude: 21.2514,
        longitude: 81.6296,
      });

      setShowScannerModal(false);
      setScannerProcessing(false);

      if (res.alreadyMarked) {
        Alert.alert(
          "Already Checked In ✅",
          `${workerNameToMark} (+91 ${workerPhoneToMark}) has already checked in for today!`
        );
      } else if (res.success) {
        Alert.alert(
          "ATTENDANCE MARKED 🎉",
          `Successfully verified and checked in: ${workerNameToMark} (+91 ${workerPhoneToMark})`
        );
      } else {
        Alert.alert("Error", "Could not record attendance in database.");
      }
    } catch (err: any) {
      setScannerProcessing(false);
      Alert.alert("Scanner Error", err?.message || "Failed to process scanned QR.");
    }
  };

  // Manual Quick Check-In (e.g. For fast verification)
  const handleManualCheckIn = async (workerPhoneToMark: string, workerName: string) => {
    try {
      const clean = workerPhoneToMark.replace(/[^0-9]/g, "").slice(-10);
      const res = await checkInWorker({
        workerId: clean,
        companyId: companyName,
        jobId: jobId,
        latitude: 21.2514,
        longitude: 81.6296,
      });

      setShowScannerModal(false);
      triggerHapticFeedback();

      if (res.alreadyMarked) {
        Alert.alert("Already Checked In ✅", `${workerName} is already marked present.`);
      } else {
        Alert.alert("ATTENDANCE MARKED 🎉", `Checked in ${workerName} (+91 ${clean}) successfully!`);
      }
    } catch (e) {
      Alert.alert("Error", "Failed to mark attendance.");
    }
  };

  // Step-By-Step PhonePe Style Animation Sequence
  const triggerSuccessAnimation = (amount: number, workerName: string, txnId: string) => {
    setSuccessDetails({ amount, workerName, txnId });
    setShowSuccessModal(true);
    setAnimStep("PROCESSING");

    spinValue.setValue(0);
    tickScale.setValue(0);
    cardSlide.setValue(80);

    const spinLoop = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 800,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    spinLoop.start();

    setTimeout(() => {
      spinLoop.stop();
      setAnimStep("TICK");
      triggerHapticFeedback();

      Animated.spring(tickScale, {
        toValue: 1,
        friction: 4,
        tension: 70,
        useNativeDriver: true,
      }).start();
    }, 1800);

    setTimeout(() => {
      setAnimStep("DETAILS");

      Animated.timing(cardSlide, {
        toValue: 0,
        duration: 450,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }).start();
    }, 2400);
  };

  const spinRotation = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const scanLineTranslate = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 210],
  });

  const handleUpdateStatus = async (
    applicantId: string,
    newStatus: "HIRED" | "REJECTED"
  ) => {
    try {
      const appRef = doc(db, "applications", applicantId);
      await updateDoc(appRef, { status: newStatus });
      Alert.alert("Applicant Updated", `Candidate status changed to ${newStatus}.`);
    } catch (error) {
      Alert.alert("Action Error", "Failed to update status.");
      console.error(error);
    }
  };

  const handlePaySalary = async (rawWorkerPhone: string, workerName: string) => {
    setPayLoading(true);
    const cleanWorkerPhone = rawWorkerPhone.replace(/[^0-9]/g, "").slice(-10);

    try {
      const result: any = await processSalaryPayment({
        companyId: companyPhone,
        workerId: cleanWorkerPhone,
        jobId: jobId,
        amount: numericPay,
        companyName: companyName,
        companyPhone: companyPhone,
      });

      setPayLoading(false);

      if (result && result.success) {
        triggerSuccessAnimation(
          numericPay,
          workerName,
          result.paymentId || result.razorpayPaymentId || "pay_" + Date.now()
        );
      } else {
        Alert.alert(
          "Payment Cancelled / Incomplete",
          result?.message || "Payment was not completed. No money was deducted."
        );
      }
    } catch (err: any) {
      setPayLoading(false);
      Alert.alert(
        "Payment Failed ❌",
        err?.message || "An unexpected error occurred while processing payment."
      );
    }
  };

  const renderApplicantCard = ({ item }: { item: Applicant }) => {
    const cleanPhone = item.workerPhone.replace(/[^0-9]/g, "").slice(-10);
    const isWorkerCheckedIn = !!attendanceMap[cleanPhone];
    const checkInInfo = attendanceMap[cleanPhone];

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.workerName}>{item.workerName}</Text>
            <Text style={styles.workerSkill}>
              Role: {item.workerSkill || "Construction Helper"}
            </Text>
            <Text style={styles.workerPhone}>📞 +91 {cleanPhone}</Text>
          </View>

          <View
            style={[
              styles.badge,
              item.status === "HIRED"
                ? styles.badgeHired
                : item.status === "REJECTED"
                ? styles.badgeRejected
                : styles.badgePending,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                item.status === "HIRED"
                  ? styles.textHired
                  : item.status === "REJECTED"
                  ? styles.textRejected
                  : styles.textPending,
              ]}
            >
              {item.status}
            </Text>
          </View>
        </View>

        {/* Live Attendance Status Indicator */}
        {item.status === "HIRED" && (
          <View style={styles.attendanceStatusRow}>
            {isWorkerCheckedIn ? (
              <View style={styles.checkedInTag}>
                <Text style={styles.checkedInTagText}>
                  ✅ PRESENT TODAY {checkInInfo?.time ? `(${checkInInfo.time})` : ""}
                </Text>
              </View>
            ) : (
              <View style={styles.pendingCheckInTag}>
                <Text style={styles.pendingCheckInTagText}>
                  ⏳ AWAITING QR CHECK-IN
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.divider} />

        {item.status === "PENDING" ? (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.rejectBtn]}
              onPress={() => handleUpdateStatus(item.id, "REJECTED")}
            >
              <Text style={styles.rejectBtnText}>DECLINE</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.hireBtn]}
              onPress={() => handleUpdateStatus(item.id, "HIRED")}
            >
              <Text style={styles.hireBtnText}>HIRE CANDIDATE</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.hiredActionArea}>
            {item.status === "HIRED" && (
              <View style={styles.btnGroup}>
                <TouchableOpacity
                  style={styles.paySalaryBtn}
                  onPress={() => handlePaySalary(item.workerPhone, item.workerName)}
                  disabled={payLoading}
                >
                  {payLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.paySalaryBtnText}>
                      💳 PAY SALARY (₹{numericPay})
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Applicant Management</Text>
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: "/screen/CompanyTransactionsScreen",
              params: { phone: companyPhone },
            })
          }
        >
          <Text style={{ fontSize: 13, fontWeight: "800", color: "#2563EB" }}>
            History 📜
          </Text>
        </TouchableOpacity>
      </View>

      {/* Top Banner with Quick Attendance Camera Scanner Button */}
      <View style={styles.scannerBanner}>
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>Worker Site Attendance</Text>
          <Text style={styles.bannerSub}>Scan worker's QR badge when they arrive</Text>
        </View>
        <TouchableOpacity style={styles.scanQrBannerBtn} onPress={handleOpenScanner}>
          <Text style={styles.scanQrBannerBtnText}>📷 SCAN QR</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.sectionTitle}>Applicants & Staff</Text>
          <Text style={styles.countBadge}>{applicants.length} Candidates</Text>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>Loading applications...</Text>
          </View>
        ) : (
          <FlatList
            data={applicants}
            keyExtractor={(item) => item.id}
            renderItem={renderApplicantCard}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No Applications Yet</Text>
                <Text style={styles.emptySubtitle}>
                  Workers who apply for this job posting will appear here in real-time.
                </Text>
              </View>
            }
          />
        )}
      </View>

      {/* Live Camera Barcode Scanner Modal */}
      <Modal
        visible={showScannerModal}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setShowScannerModal(false)}
      >
        <SafeAreaView style={styles.cameraContainer}>
          <StatusBar barStyle="light-content" backgroundColor="#000000" />

          {/* Scanner Header */}
          <View style={styles.scannerHeader}>
            <TouchableOpacity
              style={styles.scannerCloseBtn}
              onPress={() => setShowScannerModal(false)}
            >
              <Text style={styles.scannerCloseBtnText}>✕ Close</Text>
            </TouchableOpacity>
            <Text style={styles.scannerHeaderTitle}>Scan Worker Badge</Text>
            <View style={{ width: 50 }} />
          </View>

          {/* Live Camera View with Viewfinder */}
          <View style={styles.cameraWrapper}>
            {cameraPermission?.granted ? (
              <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                barcodeScannerSettings={{
                  barcodeTypes: ["qr"],
                }}
                onBarcodeScanned={scannerProcessing ? undefined : handleBarCodeScanned}
              />
            ) : (
              <View style={styles.noCameraView}>
                <Text style={styles.noCameraText}>Camera permission not active</Text>
                <TouchableOpacity
                  style={styles.grantBtn}
                  onPress={requestCameraPermission}
                >
                  <Text style={styles.grantBtnText}>Grant Camera Permission</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Viewfinder Frame with Animated Scanner Line */}
            <View style={styles.viewfinderContainer}>
              <View style={styles.viewfinderBox}>
                <Animated.View
                  style={[
                    styles.scanLaserLine,
                    { transform: [{ translateY: scanLineTranslate }] },
                  ]}
                />
              </View>
            </View>
          </View>

          {/* Bottom Scanner Info & Manual Fast-Select */}
          <View style={styles.scannerFooter}>
            <Text style={styles.scannerTip}>
              Point camera directly at the QR Code shown on the worker's phone
            </Text>

            {/* Quick-Mark Present Shortcut for Hired Workers */}
            <View style={styles.quickMarkList}>
              <Text style={styles.quickMarkHeader}>Or tap hired worker to mark present:</Text>
              <View style={styles.quickWorkerRow}>
                {applicants
                  .filter((a) => a.status === "HIRED")
                  .map((a) => (
                    <TouchableOpacity
                      key={a.id}
                      style={styles.quickWorkerChip}
                      onPress={() => handleManualCheckIn(a.workerPhone, a.workerName)}
                    >
                      <Text style={styles.quickWorkerChipText}>
                        ✓ {a.workerName}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </View>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Dynamic PhonePe Green Screen Payment Modal */}
      <Modal visible={showSuccessModal} transparent={false} animationType="fade">
        <View style={styles.successOverlay}>
          <StatusBar barStyle="light-content" backgroundColor="#15803D" />

          {animStep === "PROCESSING" ? (
            <View style={{ alignItems: "center" }}>
              <Animated.View
                style={[
                  styles.spinnerRing,
                  { transform: [{ rotate: spinRotation }] },
                ]}
              />
              <Text style={styles.processingText}>Verifying Payment...</Text>
            </View>
          ) : (
            <>
              <Animated.View
                style={[
                  styles.greenCircle,
                  { transform: [{ scale: tickScale }] },
                ]}
              >
                <Text style={styles.tickIcon}>✓</Text>
              </Animated.View>

              {animStep === "DETAILS" && (
                <>
                  <Text style={styles.successHeadline}>Payment Successful!</Text>
                  <Text style={styles.successAmount}>₹ {successDetails.amount}.00</Text>

                  <Animated.View
                    style={[
                      styles.detailsCard,
                      { transform: [{ translateY: cardSlide }] },
                    ]}
                  >
                    <Text style={styles.detailLabel}>SALARY PAID TO</Text>
                    <Text style={styles.detailValue}>{successDetails.workerName}</Text>

                    <View style={styles.cardDivider} />

                    <Text style={styles.detailLabel}>PAYMENT TRANSACTION ID</Text>
                    <Text style={styles.detailValueSub}>{successDetails.txnId}</Text>
                  </Animated.View>

                  <TouchableOpacity
                    style={styles.doneBtn}
                    onPress={() => setShowSuccessModal(false)}
                  >
                    <Text style={styles.doneBtnText}>DONE 👍</Text>
                  </TouchableOpacity>
                </>
              )}
            </>
          )}
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
  backBtnText: { fontSize: 15, fontWeight: "700", color: "#2563EB" },
  headerTitle: { fontSize: 16, fontWeight: "800", color: "#0F172A" },
  
  // Banner
  scannerBanner: {
    backgroundColor: "#1E293B",
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 3,
  },
  bannerTitle: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  bannerSub: { color: "#94A3B8", fontSize: 12, fontWeight: "600", marginTop: 2 },
  scanQrBannerBtn: {
    backgroundColor: "#16A34A",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    elevation: 2,
  },
  scanQrBannerBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },

  content: { flex: 1, padding: 16 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: "#0F172A" },
  countBadge: { fontSize: 12, fontWeight: "700", color: "#2563EB", backgroundColor: "#DBEAFE", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  listContent: { paddingBottom: 20 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: "#E2E8F0" },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  workerName: { fontSize: 16, fontWeight: "800", color: "#0F172A" },
  workerSkill: { fontSize: 13, color: "#475569", marginTop: 2, fontWeight: "600" },
  workerPhone: { fontSize: 13, color: "#2563EB", marginTop: 4, fontWeight: "700" },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgePending: { backgroundColor: "#FEF3C7" },
  badgeHired: { backgroundColor: "#DCFCE7" },
  badgeRejected: { backgroundColor: "#FEE2E2" },
  badgeText: { fontSize: 11, fontWeight: "800" },
  textPending: { color: "#D97706" },
  textHired: { color: "#16A34A" },
  textRejected: { color: "#DC2626" },

  attendanceStatusRow: { marginTop: 10 },
  checkedInTag: {
    backgroundColor: "#DCFCE7",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#86EFAC",
  },
  checkedInTagText: { color: "#15803D", fontSize: 11, fontWeight: "800" },
  pendingCheckInTag: {
    backgroundColor: "#FEF3C7",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  pendingCheckInTagText: { color: "#B45309", fontSize: 11, fontWeight: "800" },

  divider: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 12 },
  actionRow: { flexDirection: "row", gap: 10 },
  actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  rejectBtn: { backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FCA5A5" },
  rejectBtnText: { color: "#DC2626", fontSize: 12, fontWeight: "800" },
  hireBtn: { backgroundColor: "#16A34A" },
  hireBtnText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  hiredActionArea: { alignItems: "center", gap: 10 },
  btnGroup: { width: "100%", gap: 10, marginTop: 4 },
  paySalaryBtn: {
    backgroundColor: "#16A34A",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    elevation: 2,
  },
  paySalaryBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900", letterSpacing: 0.3 },
  loadingBox: { paddingVertical: 40, alignItems: "center" },
  loadingText: { marginTop: 10, color: "#64748B", fontSize: 13 },
  emptyCard: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 24, alignItems: "center", borderWidth: 1, borderColor: "#E2E8F0", marginTop: 10 },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: "#0F172A" },
  emptySubtitle: { fontSize: 12, color: "#64748B", marginTop: 4, textAlign: "center" },
  
  // Camera Scanner Styles
  cameraContainer: { flex: 1, backgroundColor: "#000000" },
  scannerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#0F172A",
  },
  scannerCloseBtn: { paddingVertical: 4, paddingHorizontal: 10 },
  scannerCloseBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  scannerHeaderTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  cameraWrapper: { flex: 1, position: "relative", justifyContent: "center", alignItems: "center" },
  viewfinderContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  viewfinderBox: {
    width: 230,
    height: 230,
    borderWidth: 2.5,
    borderColor: "#22C55E",
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  scanLaserLine: {
    width: "100%",
    height: 3,
    backgroundColor: "#22C55E",
    shadowColor: "#22C55E",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 5,
  },
  noCameraView: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  noCameraText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700", marginBottom: 14 },
  grantBtn: { backgroundColor: "#2563EB", paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10 },
  grantBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  scannerFooter: {
    backgroundColor: "#0F172A",
    padding: 20,
    alignItems: "center",
  },
  scannerTip: { color: "#94A3B8", fontSize: 12, textAlign: "center", fontWeight: "600", marginBottom: 14 },
  quickMarkList: { width: "100%", alignItems: "center" },
  quickMarkHeader: { color: "#CBD5E1", fontSize: 12, fontWeight: "700", marginBottom: 8 },
  quickWorkerRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" },
  quickWorkerChip: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  quickWorkerChipText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },

  // Dynamic Green Screen Styles
  successOverlay: {
    flex: 1,
    backgroundColor: "#15803D",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  spinnerRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 6,
    borderColor: "rgba(255, 255, 255, 0.25)",
    borderTopColor: "#FFFFFF",
  },
  processingText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
    marginTop: 24,
    letterSpacing: 0.6,
  },
  greenCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    elevation: 10,
  },
  tickIcon: { fontSize: 52, fontWeight: "900", color: "#15803D" },
  successHeadline: { fontSize: 22, fontWeight: "800", color: "#DCFCE7" },
  successAmount: { fontSize: 44, fontWeight: "900", color: "#FFFFFF", marginTop: 6, marginBottom: 30 },
  detailsCard: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    marginBottom: 30,
  },
  detailLabel: { fontSize: 10, fontWeight: "800", color: "#86EFAC", letterSpacing: 0.8 },
  detailValue: { fontSize: 18, fontWeight: "800", color: "#FFFFFF", marginTop: 4 },
  cardDivider: { height: 1, backgroundColor: "rgba(255, 255, 255, 0.2)", marginVertical: 12 },
  detailValueSub: { fontSize: 13, fontWeight: "700", color: "#DCFCE7", marginTop: 2 },
  doneBtn: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 30,
    elevation: 4,
  },
  doneBtnText: { color: "#15803D", fontSize: 15, fontWeight: "900", letterSpacing: 0.5 },
});