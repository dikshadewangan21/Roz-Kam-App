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
  Alert,
  Image,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../constants/firebaseConfig";
import { useJobs, Job } from "../../hooks/useJobs";

export default function WorkerDashboard() {
  const params = useLocalSearchParams();
  const userName = (params.name as string) || "Ramesh Kumar";
  const userPhone = (params.phone as string) || "9876543210";

  const { subscribeToActiveJobs } = useJobs();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [myApplications, setMyApplications] = useState<Record<string, string>>({});

  useEffect(() => {
    const unsubscribe = subscribeToActiveJobs((fetchedJobs) => {
      setJobs(fetchedJobs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const appsRef = collection(db, "applications");
    const unsubscribe = onSnapshot(appsRef, (snapshot) => {
      const appMap: Record<string, string> = {};
      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.jobId) {
          appMap[data.jobId] = data.status;
        }
      });

      Object.values(appMap).forEach((st) => {
        if (st === "HIRED" && !myApplications["NOTIFIED"]) {
          Alert.alert("ACCEPTED 👍", "Your job has been accepted");
          appMap["NOTIFIED"] = "TRUE";
        }
      });

      setMyApplications(appMap);
    });

    return () => unsubscribe();
  }, []);

  const renderJobCard = ({ item }: { item: Job }) => {
    const jobAppStatus = item.id ? myApplications[item.id] : undefined;

    return (
      // Entire Box Clickable using outer TouchableOpacity
      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.jobCard}
        onPress={() =>
          router.push({
            pathname: "/screen/JobDetails",
            params: { 
              jobId: item.id || "", 
              userPhone: userPhone,
              title: item.title,
              companyName: item.companyName,
              dailyPay: item.dailyPay,
              location: item.location,
              status: jobAppStatus || "OPEN",
            },
          })
        }
      >
        <View style={styles.jobHeader}>
          <View style={styles.jobInfo}>
            <Text style={styles.jobTitle}>{item.title}</Text>
            <Text style={styles.companyName}>{item.companyName}</Text>
          </View>

          <View style={styles.payBadge}>
            <Text style={styles.payText}>{item.dailyPay}</Text>
            <Text style={styles.paySubtext}>/ Day</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaText}>📍 {item.location}</Text>
          <Text style={styles.metaText}>•</Text>
          <Text style={styles.metaText}>👥 {item.workersNeeded} Workers</Text>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.cardFooter}>
          {jobAppStatus === "HIRED" ? (
            <View style={styles.acceptedStatusBadge}>
              <Text style={styles.acceptedStatusText}>ACCEPTED 👍</Text>
            </View>
          ) : (
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>OPEN POSITION</Text>
            </View>
          )}

          <View
            style={[
              styles.applyBtn,
              jobAppStatus === "HIRED" && styles.appliedBtnGreen,
            ]}
          >
            <Text style={styles.applyBtnText}>
              {jobAppStatus === "HIRED" ? "ACCEPTED 👍" : "VIEW & APPLY →"}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerLogoContainer}>
            <Image
              source={require("../../../assets/images/rozkaam-logo.jpg")}
              style={styles.headerLogoImage}
              resizeMode="contain"
            />
          </View>
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.welcomeText}>
              Welcome, {userName.split(" ")[0]} 👋
            </Text>
            <Text style={styles.headerSubtitle}>Aaj Kaam, Aaj Paisa</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.profileBtn}
          onPress={() =>
            router.push({
              pathname: "/screen/Profile",
              params: { phone: userPhone, name: userName },
            })
          }
        >
          <Text style={styles.profileBtnText}>👤 Profile</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Wallet Balance Card */}
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.walletCard}
          onPress={() => router.push("/screen/Wallet")}
        >
          <View>
            <Text style={styles.walletLabel}>TOTAL BALANCE</Text>
            <Text style={styles.walletAmount}>₹ 2,450</Text>
          </View>

          <View style={styles.withdrawChip}>
            <Text style={styles.withdrawChipText}>WITHDRAW →</Text>
          </View>
        </TouchableOpacity>

        {/* Jobs Header Row */}
        <View style={styles.jobsHeaderRow}>
          <Text style={styles.sectionTitle}>Today Jobs</Text>
          <Text style={styles.jobCount}>{jobs.length} Available</Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#16A34A" />
            <Text style={styles.loadingText}>Loading jobs...</Text>
          </View>
        ) : (
          <FlatList
            data={jobs}
            keyExtractor={(item, index) => item.id || index.toString()}
            renderItem={renderJobCard}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>No active jobs currently</Text>
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
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerLogoContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    padding: 3,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: "hidden",
  },
  headerLogoImage: {
    width: "100%",
    height: "100%",
    borderRadius: 9,
  },
  welcomeText: { fontSize: 18, fontWeight: "800", color: "#0F172A" },
  headerSubtitle: { fontSize: 11, color: "#64748B", fontWeight: "600", marginTop: 2 },
  profileBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#052E16",
    justifyContent: "center",
    alignItems: "center",
  },
  profileBtnText: { color: "#4ADE80", fontSize: 12, fontWeight: "800" },
  content: { flex: 1, padding: 20 },
  walletCard: {
    backgroundColor: "#052E16",
    borderRadius: 18,
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  walletLabel: { color: "#86EFAC", fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  walletAmount: { color: "#FFFFFF", fontSize: 26, fontWeight: "900", marginTop: 2 },
  withdrawChip: { backgroundColor: "#16A34A", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  withdrawChipText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  jobsHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#0F172A" },
  jobCount: { fontSize: 12, fontWeight: "700", color: "#16A34A", backgroundColor: "#DCFCE7", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  listContent: { paddingBottom: 20 },
  jobCard: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: "#E2E8F0" },
  jobHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  jobInfo: { flex: 1, marginRight: 10 },
  jobTitle: { fontSize: 16, fontWeight: "800", color: "#0F172A" },
  companyName: { fontSize: 13, color: "#64748B", marginTop: 2 },
  payBadge: { alignItems: "flex-end" },
  payText: { fontSize: 18, fontWeight: "900", color: "#16A34A" },
  paySubtext: { fontSize: 10, color: "#64748B" },
  metaRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  metaText: { fontSize: 12, color: "#475569", fontWeight: "600" },
  cardDivider: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 12 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statusBadge: { backgroundColor: "#F0FDF4", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  acceptedStatusBadge: { backgroundColor: "#DCFCE7", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { color: "#16A34A", fontSize: 10, fontWeight: "800" },
  acceptedStatusText: { color: "#15803D", fontSize: 10, fontWeight: "900" },
  applyBtn: { backgroundColor: "#16A34A", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  appliedBtnGreen: { backgroundColor: "#15803D" },
  applyBtnText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", marginTop: 40 },
  loadingText: { marginTop: 10, fontSize: 13, color: "#64748B" },
  emptyContainer: { padding: 30, alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: "#E2E8F0" },
  emptyTitle: { fontSize: 15, fontWeight: "800", color: "#0F172A" },
});