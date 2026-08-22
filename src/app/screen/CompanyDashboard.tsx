import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  StatusBar,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useJobs, Job } from "../../hooks/useJobs";

export default function CompanyDashboardScreen() {
  const params = useLocalSearchParams();
  const companyName = (params.companyName as string) || "News22bharat";
  const phone = (params.phone as string) || "9876543210";

  const { subscribeToActiveJobs } = useJobs();
  const [companyJobs, setCompanyJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Real-time Firebase Sync
  useEffect(() => {
    const unsubscribe = subscribeToActiveJobs((fetchedJobs) => {
      setCompanyJobs(fetchedJobs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Dynamic Analytics Calculations
  const totalPosted = companyJobs.length;
  const activePostsCount = companyJobs.filter((j) => j.status === "ACTIVE").length;
  const totalWorkersNeeded = companyJobs.reduce(
    (sum, job) => sum + (parseInt(job.workersNeeded.toString()) || 0),
    0
  );

  const renderJobPostCard = ({ item }: { item: Job }) => (
    // ENTIRE JOB CARD IS CLICKABLE
    <TouchableOpacity
      activeOpacity={0.88}
      style={styles.jobCard}
      onPress={() =>
        router.push({
          pathname: "/screen/ManageJob",
          params: { jobId: item.id, phone: phone, companyName: companyName },
        })
      }
    >
      <View style={styles.cardHeader}>
        <View style={styles.titleArea}>
          <Text style={styles.jobTitle}>{item.title}</Text>
          <Text style={styles.postDate}>
            Company: {item.companyName || companyName}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            item.status === "ACTIVE" ? styles.activeBadge : styles.completedBadge,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              item.status === "ACTIVE" ? styles.activeText : styles.completedText,
            ]}
          >
            {item.status || "ACTIVE"}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>WORKERS NEEDED</Text>
          <Text style={styles.statValue}>
            {item.workersHired || 0} / {item.workersNeeded}
          </Text>
        </View>

        <View style={styles.verticalDivider} />

        <View style={styles.statBox}>
          <Text style={styles.statLabel}>DAILY PAY</Text>
          <Text style={styles.payValue}>{item.dailyPay}</Text>
        </View>
      </View>

      {/* HIGHLIGHTED COLORFUL VIEW APPLICANTS BUTTON */}
      <View style={styles.cardActions}>
        <View style={styles.manageBtn}>
          <Text style={styles.manageBtnText}>VIEW APPLICANTS →</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greetingText}>Company Portal</Text>
          <Text style={styles.companyNameText}>{companyName}</Text>
        </View>
        <TouchableOpacity
          style={styles.postJobTopBtn}
          onPress={() =>
            router.push({
              pathname: "/screen/PostJob",
              params: { phone, companyName },
            })
          }
        >
          <Text style={styles.postJobTopBtnText}>+ POST JOB</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
        {/* Quick Analytics Summary */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>{totalPosted}</Text>
            <Text style={styles.summaryLabel}>Total Posted</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={[styles.summaryNumber, { color: "#2563EB" }]}>
              {activePostsCount}
            </Text>
            <Text style={styles.summaryLabel}>Active Post</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={[styles.summaryNumber, { color: "#16A34A" }]}>
              {totalWorkersNeeded}
            </Text>
            <Text style={styles.summaryLabel}>Workers Needed</Text>
          </View>
        </View>

        {/* Action Banner */}
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.postBanner}
          onPress={() =>
            router.push({
              pathname: "/screen/PostJob",
              params: { phone, companyName },
            })
          }
        >
          <View>
            <Text style={styles.bannerTitle}>Need Daily Workers Fast?</Text>
            <Text style={styles.bannerSubtitle}>
              Post a job in 2 minutes and connect with workers nearby
            </Text>
          </View>
          <View style={styles.bannerBtn}>
            <Text style={styles.bannerBtnText}>CREATE POST</Text>
          </View>
        </TouchableOpacity>

        {/* Active Job Requirements List */}
        <View style={styles.listSection}>
          <Text style={styles.sectionTitle}>Your Job Requirements</Text>

          {loading ? (
            <View style={{ paddingVertical: 20, alignItems: "center" }}>
              <ActivityIndicator size="large" color="#2563EB" />
              <Text style={{ marginTop: 8, color: "#64748B", fontSize: 13 }}>
                Loading jobs from Firebase...
              </Text>
            </View>
          ) : (
            <FlatList
              data={companyJobs}
              keyExtractor={(item, index) => item.id || index.toString()}
              renderItem={renderJobPostCard}
              scrollEnabled={false}
              ListEmptyComponent={
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>No Jobs Posted Yet</Text>
                  <Text style={styles.emptySubtitle}>
                    Click "+ POST JOB" to publish your requirement live on Firebase.
                  </Text>
                </View>
              }
            />
          )}
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
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  greetingText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  companyNameText: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0F172A",
  },
  postJobTopBtn: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  postJobTopBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  summaryContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  summaryNumber: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0F172A",
  },
  summaryLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "700",
    marginTop: 2,
  },
  postBanner: {
    backgroundColor: "#0F172A",
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    flexDirection: "column",
    gap: 12,
  },
  bannerTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  bannerSubtitle: {
    color: "#94A3B8",
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  bannerBtn: {
    backgroundColor: "#16A34A",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  bannerBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  listSection: {
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 12,
  },
  jobCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  titleArea: {
    flex: 1,
    marginRight: 8,
  },
  jobTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  postDate: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "600",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  activeBadge: {
    backgroundColor: "#DBEAFE",
  },
  completedBadge: {
    backgroundColor: "#F1F5F9",
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
  },
  activeText: {
    color: "#2563EB",
  },
  completedText: {
    color: "#64748B",
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 12,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
  },
  verticalDivider: {
    width: 1,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 12,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 2,
  },
  payValue: {
    fontSize: 15,
    fontWeight: "900",
    color: "#16A34A",
    marginTop: 2,
  },
  cardActions: {
    marginTop: 4,
  },
  manageBtn: {
    backgroundColor: "#2563EB",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  manageBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  emptySubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
    textAlign: "center",
  },
});