import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../constants/firebaseConfig";

interface PaymentTxn {
  id: string;
  workerId: string;
  jobId: string;
  amount: number;
  razorpayPaymentId?: string;
  status: string;
  createdAt?: any;
}

export default function CompanyTransactionsScreen() {
  const params = useLocalSearchParams();
  const rawCompanyPhone = (params.phone as string) || "9876543210";
  const companyPhone = rawCompanyPhone.replace(/[^0-9]/g, "").slice(-10);

  const [transactions, setTransactions] = useState<PaymentTxn[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [totalSpent, setTotalSpent] = useState<number>(0);

  useEffect(() => {
    const payQuery = query(
      collection(db, "payments"),
      where("companyId", "==", companyPhone)
    );

    const unsubscribe = onSnapshot(
      payQuery,
      (snapshot) => {
        let spentSum = 0;
        const list: PaymentTxn[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          const amt = Number(data.amount) || 0;
          if (data.status === "SUCCESS") {
            spentSum += amt;
          }
          return {
            id: docSnap.id,
            workerId: data.workerId,
            jobId: data.jobId,
            amount: amt,
            razorpayPaymentId: data.razorpayPaymentId || data.paymentId || "N/A",
            status: data.status || "SUCCESS",
            createdAt: data.createdAt,
          };
        });

        setTotalSpent(spentSum);
        setTransactions(list.reverse());
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching company payments:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [companyPhone]);

  const renderItem = ({ item }: { item: PaymentTxn }) => {
    const formattedDate = item.createdAt
      ? new Date(item.createdAt.seconds * 1000).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "Recently";

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.iconBox}>
            <Text style={styles.iconText}>↗</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.workerTitle}>Salary Paid to Worker</Text>
            <Text style={styles.workerSub}>Worker Phone: +91 {item.workerId}</Text>
            <Text style={styles.txDate}>🗓 {formattedDate}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.amountText}>- ₹{item.amount}</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>SUCCESS ✅</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />
        <Text style={styles.refText}>Txn Ref: {item.razorpayPaymentId}</Text>
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
        <Text style={styles.headerTitle}>Payment History</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.content}>
        {/* Total Payout Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>TOTAL SALARY DISBURSED</Text>
          <Text style={styles.summaryAmount}>₹ {totalSpent.toLocaleString("en-IN")}</Text>
          <Text style={styles.summarySub}>All payouts verified via Rozkaam Gateway</Text>
        </View>

        <Text style={styles.sectionTitle}>Transaction Log</Text>

        {loading ? (
          <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={transactions}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No Payments Made Yet</Text>
                <Text style={styles.emptySubtitle}>
                  Whenever you pay salary to hired candidates, history will show here with date and txn ID.
                </Text>
              </View>
            }
          />
        )}
      </View>
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
  summaryCard: {
    backgroundColor: "#1E293B",
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
  },
  summaryLabel: { fontSize: 11, color: "#94A3B8", fontWeight: "800", letterSpacing: 0.6 },
  summaryAmount: { fontSize: 32, fontWeight: "900", color: "#FFFFFF", marginTop: 4 },
  summarySub: { fontSize: 11, color: "#64748B", marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#0F172A", marginBottom: 12 },
  listContent: { paddingBottom: 20 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
  },
  iconText: { color: "#DC2626", fontSize: 18, fontWeight: "900" },
  workerTitle: { fontSize: 14, fontWeight: "800", color: "#0F172A" },
  workerSub: { fontSize: 12, color: "#475569", marginTop: 1, fontWeight: "600" },
  txDate: { fontSize: 11, color: "#94A3B8", marginTop: 2 },
  amountText: { fontSize: 16, fontWeight: "900", color: "#DC2626" },
  statusBadge: { backgroundColor: "#DCFCE7", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
  statusBadgeText: { fontSize: 9, fontWeight: "800", color: "#16A34A" },
  divider: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 10 },
  refText: { fontSize: 11, color: "#64748B", fontStyle: "italic" },
  emptyCard: { backgroundColor: "#FFFFFF", borderRadius: 14, padding: 24, alignItems: "center", borderWidth: 1, borderColor: "#E2E8F0" },
  emptyTitle: { fontSize: 15, fontWeight: "800", color: "#0F172A" },
  emptySubtitle: { fontSize: 12, color: "#64748B", marginTop: 4, textAlign: "center" },
});