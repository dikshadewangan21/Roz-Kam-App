import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useJobs } from "../../hooks/useJobs";

const CATEGORIES = [
  "Technical & Skilled Operative",
  "Construction & Site Operations",
  "Factory & Production",
  "Logistics & Warehouse",
  "Commercial Maintenance",
  "Event & Hospitality Support",
];

export default function PostJobScreen() {
  const { postNewJob, loading } = useJobs();

  // Company Form States
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  const [dailyPay, setDailyPay] = useState("");
  const [workersNeeded, setWorkersNeeded] = useState("");
  const [timing, setTiming] = useState("");
  const [workDays, setWorkDays] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");

  const handlePublishJob = async () => {
    if (
      !companyName.trim() ||
      !jobTitle.trim() ||
      !dailyPay.trim() ||
      !workersNeeded.trim() ||
      !location.trim()
    ) {
      Alert.alert(
        "Form Incomplete",
        "Company Name, Job Title, Salary, Workers Count aur Location bharna zaroori hai."
      );
      return;
    }

    try {
      await postNewJob({
        companyId: "COMPANY_TEMP_ID",
        companyName: companyName.trim(),
        title: jobTitle.trim(),
        category: selectedCategory,
        dailyPay: `₹${dailyPay.trim()}`,
        workersNeeded: workersNeeded.trim(),
        timing: timing.trim() || "09:00 AM - 06:00 PM",
        location: location.trim(),
        description: `Days: ${workDays.trim() || "Regular"} | Details: ${description.trim()}`,
      });

      Alert.alert(
        "Job Posted! 👍",
        "Aapki job live post ho gayi hai.",
        [
          {
            text: "OK",
            onPress: () => router.replace("/screen/CompanyDashboard"),
          },
        ]
      );
    } catch (error) {
      Alert.alert("Error", "Job post nahi ho saka. Net check karein.");
      console.error(error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create New Job Post</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.sectionHeading}>Job Details Fill Karein</Text>

        {/* Company Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Company / Business Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Company ka naam likhein"
            placeholderTextColor="#94A3B8"
            value={companyName}
            onChangeText={setCompanyName}
          />
        </View>

        {/* Job Title */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Job Title / Role *</Text>
          <TextInput
            style={styles.input}
            placeholder="Kaam ka naam (e.g. Helper, Technician)"
            placeholderTextColor="#94A3B8"
            value={jobTitle}
            onChangeText={setJobTitle}
          />
        </View>

        {/* Category */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Category Select Karein *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catRow}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.catChip,
                  selectedCategory === cat && styles.catChipActive,
                ]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text
                  style={[
                    styles.catChipText,
                    selectedCategory === cat && styles.catChipTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Salary & Workers Needed */}
        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Daily Salary (₹) *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 500"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              value={dailyPay}
              onChangeText={setDailyPay}
            />
          </View>

          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Kitne Worker Chahiye *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 2"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              value={workersNeeded}
              onChangeText={setWorkersNeeded}
            />
          </View>
        </View>

        {/* Timing & Days */}
        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Shift Timing</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 9:00 AM - 6:00 PM"
              placeholderTextColor="#94A3B8"
              value={timing}
              onChangeText={setTiming}
            />
          </View>

          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Kitne Din Ka Kaam Hai</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 5 Days / Daily Shift"
              placeholderTextColor="#94A3B8"
              value={workDays}
              onChangeText={setWorkDays}
            />
          </View>
        </View>

        {/* Location */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Work Location / Address *</Text>
          <TextInput
            style={styles.input}
            placeholder="Kaam ki jagah / Address"
            placeholderTextColor="#94A3B8"
            value={location}
            onChangeText={setLocation}
          />
        </View>

        {/* Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Extra Info / Description (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Koi zaroori details ya instructions..."
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            value={description}
            onChangeText={setDescription}
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handlePublishJob}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitBtnText}>POST JOB NOW</Text>
          )}
        </TouchableOpacity>
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
    color: "#2563EB",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: "800",
    color: "#475569",
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#0F172A",
  },
  textArea: {
    height: 90,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  catRow: {
    flexDirection: "row",
    marginTop: 4,
  },
  catChip: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  catChipActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  catChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  catChipTextActive: {
    color: "#FFFFFF",
  },
  submitBtn: {
    backgroundColor: "#2563EB",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 10,
  },
  submitBtnDisabled: {
    backgroundColor: "#93C5FD",
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});