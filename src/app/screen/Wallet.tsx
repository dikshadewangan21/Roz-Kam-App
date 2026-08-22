import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  StatusBar,
  SafeAreaView,
  Alert,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  collection,
  onSnapshot,
  doc,
  query,
  where,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../constants/firebaseConfig";
import { createWithdrawalRequest } from "../../services/payment/paymentRepository";

interface Transaction {
  id: string;
  title?: string;
  company?: string;
  amount: string;
  rawAmount: number;
  type: "CREDIT" | "WITHDRAWAL";
  date?: string;
  status: "Completed" | "Pending";
  upiId?: string;
}

export default function WalletScreen() {
  const params = useLocalSearchParams();
  
  // Clean raw phone param to ensure exact 10-digit match in Firestore (e.g. +91 9876543210 -> 9876543210)
  const rawPhone = (params.phone as string) || "9876543210";
  const workerPhone = rawPhone.replace(/[^0-9]/g, "").slice(-10);

  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [upiId, setUpiId] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [withdrawLoading, setWithdrawLoading] = useState<boolean>(false);

  // Live Firebase Sync (Balance + Payments + Withdrawals)
  useEffect(() => {
    // 1. Sync Wallet Total Balance
    const walletRef = doc(db, "wallets", workerPhone);
    const unsubWallet = onSnapshot(walletRef, (docSnap) => {
      if (docSnap.exists()) {
        setBalance(docSnap.data().totalBalance || 0);
      }
    });

    // 2. Sync Payments (From Razorpay / Company)
    const payQuery = query(
      collection(db, "payments"),
      where("workerId", "==", workerPhone)
    );

    const unsubPay = onSnapshot(payQuery, (paySnap) => {
      const payList: Transaction[] = paySnap.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          title: `Job Salary #${data.jobId || "Daily Work"}`,
          company: `Company ID: ${data.companyId || "Employer"}`,
          amount: `+ ₹${data.amount}`,
          rawAmount: Number(data.amount) || 0,
          type: "CREDIT",
          date: data.createdAt
            ? new Date(data.createdAt.seconds * 1000).toLocaleDateString("en-IN")
            : "Today",
          status: data.status === "SUCCESS" ? "Completed" : "Pending",
        };
      });

      // 3. Sync Withdrawals
      const withQuery = query(
        collection(db, "withdrawals"),
        where("workerId", "==", workerPhone)
      );

      const unsubWith = onSnapshot(withQuery, (withSnap) => {
        const withList: Transaction[] = withSnap.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            title: "Bank Withdrawal",
            company: `UPI: ${data.upiId || "Bank Account"}`,
            amount: `- ₹${data.amount}`,
            rawAmount: Number(data.amount) || 0,
            type: "WITHDRAWAL",
            date: data.createdAt
              ? new Date(data.createdAt.seconds * 1000).toLocaleDateString("en-IN")
              : "Today",
            status: data.status === "SUCCESS" ? "Completed" : "Pending",
            upiId: data.upiId,
          };
        });

        // Combine & Sort History
        const combined = [...payList, ...withList];
        setTransactions(combined.reverse());
        setLoading(false);
      });

      return () => unsubWith();
    });

    return () => {
      unsubWallet();
      unsubPay();
    };
  }, [workerPhone]);

  // Handle Bank / UPI Withdrawal
  const handleWithdraw = async () => {
    if (!upiId.trim()) {
      Alert.alert("ENTER UPI ID", "Please enter your GPay / PhonePe / Paytm UPI ID.");
      return;
    }

    if (balance <= 0) {
      Alert.alert("LOW BALANCE", "You do not have enough balance to withdraw.");
      return;
    }

    setWithdrawLoading(true);

    const res = await createWithdrawalRequest(workerPhone, balance, upiId.trim());

    setWithdrawLoading(false);

    if (res.success) {
      Alert.alert(
        "REQUESTED ⏳",
        `Withdrawal of ₹${balance} is in progress. Status will update to PAYMENT DONE once transferred.`
      );
      setUpiId("");
    } else {
      Alert.alert("ERROR", "Failed to submit request.");
    }
  };

  // Test status change PENDING -> PAYMENT DONE
  const handleSimulatePaymentDone = async (txId: string) => {
    try {
      const txRefDoc = doc(db, "withdrawals", txId);
      await updateDoc(txRefDoc, { status: "SUCCESS" });
      Alert.alert("PAYMENT DONE 👍", "Money transferred to bank account.");
    } catch (err) {
      console.error(err);
    }
  };

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <View style={styles.transactionCard}>
      <View style={styles.txIconContainer}>
        <Text style={styles.txIconText}>
          {item.type === "CREDIT" ? "↓" : "↑"}
        </Text>
      </View>

      <View style={styles.txDetails}>
        <Text style={styles.txTitle}>{item.title}</Text>
        <Text style={styles.txCompany}>{item.company}</Text>
        <Text style={styles.txDate}>{item.date}</Text>
      </View>

      <View style={styles.txAmountContainer}>
        <Text
          style={[
            styles.txAmount,
            item.type === "CREDIT" ? styles.creditText : styles.debitText,
          ]}
        >
          {item.amount}
        </Text>

        {item.type === "WITHDRAWAL" && item.status === "Pending" ? (
          <TouchableOpacity
            onPress={() => handleSimulatePaymentDone(item.id)}
            style={styles.pendingBadge}
          >
            <Text style={styles.pendingBadgeText}>PENDING ⏳</Text>
          </TouchableOpacity>
        ) : (
          <Text
            style={[
              styles.txStatus,
              item.status === "Completed" && styles.completedStatusText,
            ]}
          >
            {item.status === "Completed" ? "PAYMENT DONE 👍" : "Pending"}
          </Text>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Wallet</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.content}>
        {/* Main Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>AVAILABLE BALANCE</Text>
          <Text style={styles.balanceAmount}>
            ₹ {balance.toLocaleString("en-IN")}
          </Text>
          <Text style={styles.subtext}>Verified & ready for payout</Text>

          {/* UPI ID Input */}
          <TextInput
            style={styles.upiInput}
            placeholder="Enter UPI ID (e.g. 9876543210@paytm)"
            placeholderTextColor="#86EFAC"
            value={upiId}
            onChangeText={setUpiId}
          />

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.withdrawBtn}
            onPress={handleWithdraw}
            disabled={withdrawLoading}
          >
            {withdrawLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.withdrawBtnText}>
                TRANSFER TO BANK / UPI 👍
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Transaction History Section */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          {loading ? (
            <ActivityIndicator size="large" color="#16A34A" />
          ) : (
            <FlatList
              data={transactions}
              keyExtractor={(item) => item.id}
              renderItem={renderTransaction}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>No transactions yet</Text>
                </View>
              }
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F1F5F9",
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
  content: {
    flex: 1,
    padding: 20,
  },
  balanceCard: {
    backgroundColor: "#052E16",
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    elevation: 5,
  },
  balanceLabel: {
    color: "#86EFAC",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  balanceAmount: {
    color: "#FFFFFF",
    fontSize: 36,
    fontWeight: "900",
    marginTop: 4,
  },
  subtext: {
    color: "#9CA3AF",
    fontSize: 12,
    marginTop: 2,
    marginBottom: 16,
  },
  upiInput: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderWidth: 1,
    borderColor: "#16A34A",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: "#FFFFFF",
    marginBottom: 14,
  },
  withdrawBtn: {
    backgroundColor: "#16A34A",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  withdrawBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  historySection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 14,
  },
  listContent: {
    paddingBottom: 20,
  },
  transactionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  txIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  txIconText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  txDetails: {
    flex: 1,
  },
  txTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  txCompany: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  txDate: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
  },
  txAmountContainer: {
    alignItems: "flex-end",
  },
  txAmount: {
    fontSize: 15,
    fontWeight: "800",
  },
  creditText: {
    color: "#16A34A",
  },
  debitText: {
    color: "#DC2626",
  },
  txStatus: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 4,
    fontWeight: "600",
  },
  completedStatusText: {
    color: "#16A34A",
    fontWeight: "800",
  },
  pendingBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
  },
  pendingBadgeText: {
    color: "#D97706",
    fontSize: 10,
    fontWeight: "800",
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  emptyText: {
    fontSize: 13,
    color: "#64748B",
  },
});