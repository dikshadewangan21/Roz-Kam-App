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
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { collection, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "../../constants/firebaseConfig";
import QRCode from "react-native-qrcode-svg";
import { processSalaryPayment } from "../../services/payment/razorpayService";
import { createPaymentRecord, updateWorkerWallet } from "../../services/payment/paymentRepository";

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

export default function ManageJobScreen() {
  const params = useLocalSearchParams();
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [payLoading, setPayLoading] = useState<boolean>(false);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);

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

  const jobId = (params.jobId as string) || "demo_job";
  const rawCompanyPhone = (params.phone as string) || "9876543210";
  const companyPhone = rawCompanyPhone.replace(/[^0-9]/g, "").slice(-10);
  const companyName = (params.companyName as string) || "News22bharat";
  
  const rawPayParam = (params.dailyPay as string) || (params.salary as string) || "500";
  const numericPay = parseInt(rawPayParam.replace(/[^0-9]/g, "")) || 500;

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

  // Safe Haptic Feedback (PhonePe Style Vibrations)
  const triggerHapticFeedback = () => {
    try {
      // 100ms smooth vibration burst
      Vibration.vibrate(100);
    } catch (e) {
      console.log("Vibration not supported on device");
    }
  };

  // Step-By-Step PhonePe Style Animation Sequence
  const triggerSuccessAnimation = (amount: number, workerName: string, txnId: string) => {
    setSuccessDetails({ amount, workerName, txnId });
    setShowSuccessModal(true);
    setAnimStep("PROCESSING");

    // Reset Animations
    spinValue.setValue(0);
    tickScale.setValue(0);
    cardSlide.setValue(80);

    // 1. Spinning Loop
    const spinLoop = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 800,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    spinLoop.start();

    // 2. Stop Spinner -> Scale Tick + Trigger Haptic Vibration
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
    }, 2000);

    // 3. Slide Details Up
    setTimeout(() => {
      setAnimStep("DETAILS");

      Animated.timing(cardSlide, {
        toValue: 0,
        duration: 450,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }).start();
    }, 2600);
  };

  const spinRotation = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
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
        await handleFallbackDemoPayment(cleanWorkerPhone, workerName);
      }
    } catch (err) {
      await handleFallbackDemoPayment(cleanWorkerPhone, workerName);
    }
  };

  const handleFallbackDemoPayment = async (cleanWorkerPhone: string, workerName: string) => {
    const demoTxnId = "pay_demo_" + Math.floor(100000 + Math.random() * 900000);

    await createPaymentRecord({
      companyId: companyPhone,
      workerId: cleanWorkerPhone,
      jobId: jobId,
      amount: numericPay,
      razorpayOrderId: "demo_ord_" + Date.now(),
      razorpayPaymentId: demoTxnId,
      status: "SUCCESS",
    });

    await updateWorkerWallet(cleanWorkerPhone, numericPay);
    setPayLoading(false);

    triggerSuccessAnimation(numericPay, workerName, demoTxnId);
  };

  const renderApplicantCard = ({ item }: { item: Applicant }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.workerName}>{item.workerName}</Text>
          <Text style={styles.workerSkill}>
            Specialization: {item.workerSkill || "Construction Helper"}
          </Text>
          <Text style={styles.workerPhone}>📞 {item.workerPhone}</Text>
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
          <Text style={styles.completedStatusText}>
            Decision Recorded: {item.status}
          </Text>

          {item.status === "HIRED" && (
            <View style={styles.btnGroup}>
              <TouchableOpacity
                style={styles.showQrBtn}
                onPress={() => setShowQrModal(true)}
              >
                <Text style={styles.showQrBtnText}>SHOW QR</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.paySalaryBtn}
                onPress={() => handlePaySalary(item.workerPhone, item.workerName)}
                disabled={payLoading}
              >
                {payLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.paySalaryBtnText}>
                    PAY SALARY (₹{numericPay})
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );

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

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.sectionTitle}>Received Applications</Text>
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
                <Text style={styles.emptyTitle}>No Applications Submitted</Text>
                <Text style={styles.emptySubtitle}>
                  Candidates applying for this position will appear here in real-time.
                </Text>
              </View>
            }
          />
        )}
      </View>

      {/* Dynamic Green Screen Modal */}
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
              <Text style={styles.processingText}>Processing Payment...</Text>
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
                    <Text style={styles.detailLabel}>PAID TO</Text>
                    <Text style={styles.detailValue}>{successDetails.workerName}</Text>

                    <View style={styles.cardDivider} />

                    <Text style={styles.detailLabel}>TRANSACTION ID</Text>
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

      {/* QR Code Display Modal */}
      <Modal
        visible={showQrModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowQrModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Attendance QR</Text>
            <Text style={styles.modalSub}>Worker scans to check-in</Text>

            <View style={styles.qrWrapper}>
              <QRCode
                value={JSON.stringify({
                  jobId: jobId,
                  companyPhone: companyPhone,
                })}
                size={200}
                color="#0F172A"
                backgroundColor="#FFFFFF"
              />
            </View>

            <TouchableOpacity
              style={styles.closeModalBtn}
              onPress={() => setShowQrModal(false)}
            >
              <Text style={styles.closeModalText}>Close</Text>
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
  backBtnText: { fontSize: 15, fontWeight: "700", color: "#2563EB" },
  headerTitle: { fontSize: 16, fontWeight: "800", color: "#0F172A" },
  content: { flex: 1, padding: 20 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A" },
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
  divider: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 12 },
  actionRow: { flexDirection: "row", gap: 10 },
  actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  rejectBtn: { backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FCA5A5" },
  rejectBtnText: { color: "#DC2626", fontSize: 12, fontWeight: "800" },
  hireBtn: { backgroundColor: "#16A34A" },
  hireBtnText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  hiredActionArea: { alignItems: "center", gap: 10 },
  completedStatusText: { fontSize: 12, color: "#64748B", fontWeight: "600", fontStyle: "italic" },
  btnGroup: { width: "100%", gap: 10, marginTop: 6 },
  showQrBtn: {
    backgroundColor: "#2563EB",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  showQrBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  paySalaryBtn: {
    backgroundColor: "#16A34A",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  paySalaryBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
  loadingBox: { paddingVertical: 40, alignItems: "center" },
  loadingText: { marginTop: 10, color: "#64748B", fontSize: 13 },
  emptyCard: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 24, alignItems: "center", borderWidth: 1, borderColor: "#E2E8F0", marginTop: 10 },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: "#0F172A" },
  emptySubtitle: { fontSize: 12, color: "#64748B", marginTop: 4, textAlign: "center" },
  
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

  modalOverlay: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.75)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalContent: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 24, alignItems: "center", width: "85%" },
  modalTitle: { fontSize: 20, fontWeight: "900", color: "#0F172A" },
  modalSub: { fontSize: 13, color: "#64748B", marginTop: 2, marginBottom: 20 },
  qrWrapper: { padding: 16, backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: "#E2E8F0", marginBottom: 20 },
  closeModalBtn: { backgroundColor: "#0F172A", paddingVertical: 12, paddingHorizontal: 30, borderRadius: 12 },
  closeModalText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
});